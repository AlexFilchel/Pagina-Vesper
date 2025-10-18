package org.vesper.service;

import com.mercadopago.client.preference.*;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
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
import org.vesper.entity.Venta;
import org.vesper.exception.MercadoPagoIntegrationException;
import org.vesper.repo.VentaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    private final VentaRepository ventaRepository;
    private final VentaService ventaService; // Para reutilizar la lógica de creación de venta

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
}
