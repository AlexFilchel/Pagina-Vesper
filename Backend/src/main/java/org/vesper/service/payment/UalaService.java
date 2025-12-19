package org.vesper.service.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.vesper.dto.PreferenciaResponseDTO;
import org.vesper.dto.VentaRequest;
import org.vesper.dto.uala.UalaAuthRequest;
import org.vesper.dto.uala.UalaAuthResponse;
import org.vesper.dto.uala.UalaCheckoutRequest;
import org.vesper.dto.uala.UalaCheckoutResponse;
import org.vesper.entity.DetalleVenta;
import org.vesper.entity.Producto;
import org.vesper.entity.Venta;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.ProductoRepository;
import org.vesper.repo.VentaRepository;
import org.vesper.service.VentaService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class UalaService implements IPaymentStrategy<String> {

    private final RestClient restClient;
    private final VentaService ventaService;
    private final VentaRepository ventaRepository;       // NECESARIO para actualizar el estado
    private final ProductoRepository productoRepository; // NECESARIO para descontar stock
    private final ObjectMapper objectMapper = new ObjectMapper(); 

    // Inyección de valores desde properties
    @Value("${uala.auth.url}")
    private String authUrl;
    @Value("${uala.checkout.url}")
    private String checkoutUrl;
    @Value("${uala.username}")
    private String username;
    @Value("${uala.client-id}")
    private String clientId;
    @Value("${uala.client-secret}")
    private String clientSecret;
    @Value("${app.public.url}")
    private String appPublicUrl;

    // Constructor con TODAS las dependencias necesarias
    public UalaService(RestClient.Builder restClientBuilder, 
                       VentaService ventaService,
                       VentaRepository ventaRepository,
                       ProductoRepository productoRepository) {
        this.restClient = restClientBuilder.build();
        this.ventaService = ventaService;
        this.ventaRepository = ventaRepository;
        this.productoRepository = productoRepository;
    }

    // --- 1. OBTENER TOKEN ---
    private String obtenerTokenDeAcceso() {
        UalaAuthRequest authRequest = UalaAuthRequest.builder()
                .username(username)
                .clientId(clientId)
                .clientSecretId(clientSecret)
                .grantType("client_credentials")
                .build();

        try {
            UalaAuthResponse response = restClient.post()
                    .uri(authUrl + "/auth/token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(authRequest)
                    .retrieve()
                    .body(UalaAuthResponse.class);

            if (response != null && response.getAccessToken() != null) {
                return response.getAccessToken();
            }
            throw new RuntimeException("Ualá devolvió un token vacío");
        } catch (Exception e) {
            throw new RuntimeException("Falló la autenticación con Ualá: " + e.getMessage());
        }
    }

    // --- 2. CREAR ORDEN (STRATEGY) ---
    @Override
    public PreferenciaResponseDTO crearOrdenDePago(VentaRequest request, Jwt jwt) {
        String token = obtenerTokenDeAcceso(); 
        Venta venta = ventaService.crearVentaPendiente(request, jwt);

        // Calculamos total seguro
        double totalCalculado = venta.getDetalles().stream()
                .mapToDouble(d -> d.getPrecioUnitario() * d.getCantidad())
                .sum();

        UalaCheckoutRequest checkoutRequest = UalaCheckoutRequest.builder()
                .amount(String.valueOf(totalCalculado))
                .description("Venta Vesper #" + venta.getId())
                .externalReference(String.valueOf(venta.getId()))
                .notificationUrl(appPublicUrl + "/api/public/payments/webhook-uala")
                .callbackSuccess(appPublicUrl + "/api/public/payments/success")
                .callbackFail(appPublicUrl + "/api/public/payments/failure")
                .build();

        UalaCheckoutResponse response = restClient.post()
                .uri(checkoutUrl + "/checkout")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(checkoutRequest)
                .retrieve()
                .body(UalaCheckoutResponse.class);

        if (response != null && response.getLinks() != null) {
            return new PreferenciaResponseDTO(
                response.getUuid(), 
                response.getLinks().getCheckoutLink()
            );
        }
        throw new RuntimeException("Error al crear preferencia en Ualá");
    }

    // --- 3. PROCESAR WEBHOOK ---
    @Override
    public void procesarWebhook(String rawJson) {
        try {
            JsonNode rootNode = objectMapper.readTree(rawJson);
            
            // Ualá envía el estado en "status" y el ID de venta en "external_reference"
            String status = rootNode.path("status").asText(); 
            String externalReference = rootNode.path("external_reference").asText();

            if (externalReference == null || externalReference.isEmpty()) {
                System.out.println("⚠️ Webhook sin referencia externa.");
                return;
            }

            Long ventaId = Long.valueOf(externalReference);
            
            // Buscamos la venta en la BD
            Venta venta = ventaRepository.findById(ventaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada: " + ventaId));

            System.out.println("🔄 Procesando Webhook Ualá - Venta #" + ventaId + " Estado: " + status);

            // Actualizamos según el estado
            if ("APPROVED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status)) {
                actualizarEstadoVentaYStock(venta, "APPROVED");
            } else if ("REJECTED".equalsIgnoreCase(status) || "FAIL".equalsIgnoreCase(status)) {
                actualizarEstadoVentaYStock(venta, "REJECTED");
            } else {
                 System.out.println("ℹ️ Estado intermedio recibido: " + status);
            }

        } catch (Exception e) {
            System.err.println("Error procesando webhook de Ualá: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // --- 4. MÉTODOS AUXILIARES (Copiados de lógica de negocio MP) ---

    private void actualizarEstadoVentaYStock(Venta venta, String estadoPago) {
        String estadoAnterior = venta.getEstado();

        // Mapeamos el estado de Ualá a tus estados de Venta
        switch (estadoPago) {
            case "APPROVED":
                venta.setEstado(Venta.EstadoVenta.COMPLETADA.toString());
                // Solo descontar stock si no estaba ya completada (para evitar duplicados)
                if (!Venta.EstadoVenta.COMPLETADA.toString().equals(estadoAnterior)) {
                    descontarStock(venta);
                }
                break;
            case "REJECTED":
                venta.setEstado(Venta.EstadoVenta.RECHAZADA.toString());
                break;
            default:
                // No hacemos nada en estados pendientes
                break;
        }
        ventaRepository.save(venta);
    }

    private void descontarStock(Venta venta) {
        for (DetalleVenta detalle : venta.getDetalles()) {
            Producto producto = productoRepository.findById(detalle.getProductoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + detalle.getProductoId()));
            
            // Lógica simple de descuento
            producto.setStock(producto.getStock() - detalle.getCantidad());
            productoRepository.save(producto);
        }
        System.out.println("✅ Stock descontado para venta #" + venta.getId());
    }
}