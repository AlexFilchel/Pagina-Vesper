package org.vesper.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercadopago.client.preference.*;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vesper.dto.PreferenciaResponseDTO;
import org.vesper.dto.VentaRequest;
import org.vesper.entity.DetalleVenta;
import org.vesper.entity.Producto;
import org.vesper.entity.RegistroPago;
import org.vesper.entity.Venta;
import org.vesper.exception.MercadoPagoIntegrationException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.ProductoRepository;
import org.vesper.repo.RegistroPagoRepository;
import org.vesper.repo.VentaRepository;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    private final VentaRepository ventaRepository;
    private final VentaService ventaService;
    private final RegistroPagoRepository registroPagoRepository;
    private final ProductoRepository productoRepository;
    private final ObjectMapper objectMapper;

    @Value("${mercadopago.base.url}")
    private String baseUrl;

    /**
     * Orquesta la creación de una venta y su correspondiente preferencia de pago en Mercado Pago.
     * 1. Registra la Venta en la base de datos con estado PENDIENTE.
     * 2. Usa el ID de la Venta como referencia externa para Mercado Pago.
     * 3. Crea la preferencia de pago y devuelve el link para que el usuario pague.
     *
     * @param ventaRequest Los detalles de los productos a comprar.
     * @param jwt El token del usuario autenticado.
     * @return Un DTO con el ID de la venta y la URL de pago.
     */
    @Transactional
    public PreferenciaResponseDTO crearOrdenYPrefencia(VentaRequest ventaRequest, Jwt jwt) {
        // 1. Crear la Venta usando la lógica de VentaService
        Venta venta = ventaService.crearVentaPendiente(ventaRequest, jwt);

        try {
            // 2. Preparar datos para Mercado Pago
            String externalRef = String.valueOf(venta.getId());
            String notificationUrl = baseUrl + "/api/public/payments/webhook";

            List<PreferenceItemRequest> items = new ArrayList<>();
            for (DetalleVenta detalle : venta.getDetalles()) {
                PreferenceItemRequest item = PreferenceItemRequest.builder()
                        .id(detalle.getProductoId().toString())
                        .title(detalle.getNombreProducto())
                        .quantity(detalle.getCantidad())
                        .unitPrice(BigDecimal.valueOf(detalle.getPrecioUnitario()))
                        .currencyId("ARS")
                        .build();
                items.add(item);
            }

        // URLs de retorno
        PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                .success(baseUrl + "/api/public/payments/success")
                .failure(baseUrl + "/api/public/payments/failure")
                .pending(baseUrl + "/api/public/payments/pending")
                .build();

        // Construcción de la preferencia
        PreferenceRequest request = PreferenceRequest.builder()
                    .items(items)
                .externalReference(externalRef) // ID de la Venta
                .notificationUrl(notificationUrl)
                .backUrls(backUrls)
                .autoReturn("approved")
                .build();

            PreferenceClient client = new PreferenceClient();
            // 3. Crear la preferencia en Mercado Pago
            Preference preference = client.create(request);

            // 4. Devolver el ID de la preferencia y la URL de pago
            return new PreferenciaResponseDTO(preference.getId(), preference.getInitPoint());
        } catch (MPApiException e) {
            String apiError = e.getApiResponse() != null ? e.getApiResponse().getContent() : e.getMessage();
            logger.error("Error de API de Mercado Pago (status {}): {}", e.getStatusCode(), apiError, e);
            throw new MercadoPagoIntegrationException("Mercado Pago rechazó la solicitud: " + apiError);
        } catch (MPException e) {
            logger.error("Fallo al comunicarse con Mercado Pago: {}", e.getMessage(), e);
            throw new MercadoPagoIntegrationException("No fue posible comunicarse con Mercado Pago. Intente nuevamente.");
        }
    }

    /**
     * Procesa una notificación de webhook de Mercado Pago.
     * Extrae el ID del pago, obtiene el estado actualizado desde la API de MP,
     * y actualiza la venta y el registro de pago correspondientes.
     * Si el pago es aprobado, descuenta el stock de los productos.
     *
     * @param rawPayload El cuerpo JSON de la notificación.
     * @throws MPException Si hay un error al comunicarse con Mercado Pago.
     * @throws IOException Si hay un error al parsear el JSON.
     * @throws MPApiException 
     */
    @Transactional
    public void procesarWebhook(String rawPayload) throws IOException, MPApiException {
        // 1. Parsear el payload para obtener el ID del pago
        Map<String, Object> payload = objectMapper.readValue(rawPayload, new TypeReference<>() {});
        Map<?, ?> dataMap = (Map<?, ?>) payload.get("data");
        if (dataMap == null || dataMap.get("id") == null) {
            throw new IllegalArgumentException("Estructura de webhook inesperada: falta 'data.id'");
        }
        Long paymentId = Long.valueOf(dataMap.get("id").toString());

        Payment payment;
        try {
            // 2. Obtener el estado actualizado del pago desde la API de Mercado Pago
            PaymentClient paymentClient = new PaymentClient();
            payment = paymentClient.get(paymentId);
        } catch (MPApiException e) {
            // La API respondió con un error (ej. 404 Not Found). La relanzamos para que GlobalExceptionHandler la capture.
            throw e;
        } catch (MPException e) {
            // Error general de la librería (ej. conexión). La envolvemos en nuestra excepción.
            logger.error("Fallo al comunicarse con Mercado Pago para obtener el pago {}: {}", paymentId, e.getMessage(), e);
            throw new MercadoPagoIntegrationException("No fue posible obtener los detalles del pago desde Mercado Pago.");
        }

        // 3. Encontrar la venta asociada a través de la referencia externa
        Long ventaId = Long.valueOf(payment.getExternalReference());
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada con id: " + ventaId));

        // 4. Crear o actualizar el registro del pago
        RegistroPago registro = registroPagoRepository.findByMpPaymentId(String.valueOf(paymentId))
                .orElseGet(RegistroPago::new);

        registro.setMpPaymentId(String.valueOf(paymentId));
        registro.setStatus(payment.getStatus());
        registro.setAmount(payment.getTransactionAmount().floatValue());
        registro.setPaymentMethod(payment.getPaymentMethodId());
        if (payment.getDateApproved() != null) {
            registro.setDateApproved(payment.getDateApproved().toLocalDateTime());
        }
        registro.setVenta(venta);
        registroPagoRepository.save(registro);

        // 5. Actualizar el estado de la venta y descontar stock si corresponde
        actualizarEstadoVentaYStock(venta, payment.getStatus());
    }

    private void actualizarEstadoVentaYStock(Venta venta, String estadoPago) {
        String estadoAnterior = venta.getEstado();

        switch (estadoPago) {
            case "approved":
                venta.setEstado(Venta.EstadoVenta.COMPLETADA.toString());
                // Solo descontar stock si la venta no estaba ya completada
                if (!Venta.EstadoVenta.COMPLETADA.toString().equals(estadoAnterior)) {
                    descontarStock(venta);
                }
                break;
            case "in_process":
            case "pending":
                venta.setEstado(Venta.EstadoVenta.PENDIENTE.toString());
                break;
            case "rejected":
                venta.setEstado(Venta.EstadoVenta.RECHAZADA.toString());
                break;
            default:
                venta.setEstado("DESCONOCIDO");
                logger.warn("Estado de pago desconocido '{}' para la venta {}", estadoPago, venta.getId());
                break;
        }
        ventaRepository.save(venta);
    }

    private void descontarStock(Venta venta) {
        for (DetalleVenta detalle : venta.getDetalles()) {
            Producto producto = productoRepository.findById(detalle.getProductoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + detalle.getProductoId()));
            producto.setStock(producto.getStock() - detalle.getCantidad());
            productoRepository.save(producto);
        }
        logger.info("Stock descontado para la venta completada #{}", venta.getId());
    }
}
