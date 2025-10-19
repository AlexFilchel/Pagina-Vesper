package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.vesper.dto.PreferenciaResponseDTO;
import org.vesper.dto.VentaRequest;
import org.vesper.entity.RegistroPago;
import org.vesper.entity.Venta;
import org.vesper.repo.RegistroPagoRepository;
import org.vesper.repo.VentaRepository;
import org.vesper.service.PaymentService;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.resources.payment.Payment;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final VentaRepository ventaRepository; // Para endpoints de debug
    private final RegistroPagoRepository registroPagoRepository; // Para endpoints de debug

    /**
     * Inicia el proceso de compra. Recibe el carrito, crea una Venta en estado 'PENDIENTE'
     * y genera una preferencia de pago en Mercado Pago.
     *
     * @param ventaRequest El DTO con la lista de productos y cantidades.
     * @param jwt El token JWT del usuario autenticado, inyectado por Spring Security.
     * @return Un DTO con el ID de la preferencia y la URL de pago (init_point).
     */
    @PostMapping("/user/payments/crearOrden")
    public ResponseEntity<PreferenciaResponseDTO> crearOrdenYPreferencia(
            @Valid @RequestBody VentaRequest ventaRequest,
            @AuthenticationPrincipal Jwt jwt) {
        System.out.println("Se invocó /create-order correctamente");
        PreferenciaResponseDTO response = paymentService.crearOrdenYPrefencia(ventaRequest, jwt);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint público para recibir notificaciones de Webhook de Mercado Pago.
     * Se encarga de procesar los cambios de estado de un pago y actualizar la venta correspondiente.
     *
     * @param payload El cuerpo de la notificación enviada por Mercado Pago.
     * @return Una respuesta HTTP 200 si el procesamiento es exitoso, o 500 si falla.
     */
    @PostMapping("/public/payments/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody Map<String, Object> payload) {
        // El logger sería más apropiado aquí que System.out.println
        try {
            Long paymentId = Long.valueOf(((Map<String, Object>) payload.get("data")).get("id").toString());

            PaymentClient paymentClient = new PaymentClient();
            Payment payment = paymentClient.get(paymentId);

            // Recuperar Venta desde external_reference
            Long ventaId = Long.valueOf(payment.getExternalReference());
            Venta venta = ventaRepository.findById(ventaId)
                    .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

            // Buscar si ya existe un registro (idempotencia)
            RegistroPago registro = registroPagoRepository.findByMpPaymentId(String.valueOf(paymentId))
                    .orElseGet(RegistroPago::new);

            registro.setMpPaymentId(String.valueOf(paymentId));
            registro.setStatus(payment.getStatus());
            registro.setAmount(payment.getTransactionAmount().floatValue());
            registro.setPaymentMethod(payment.getPaymentMethodId());

            // ✅ Conversión de OffsetDateTime a LocalDateTime
            if (payment.getDateApproved() != null) {
                registro.setDateApproved(payment.getDateApproved().toLocalDateTime());
            }

            registro.setVenta(venta);

            registroPagoRepository.save(registro);

            // Actualizar estado de la venta
            switch (payment.getStatus()) {
                case "approved" -> venta.setEstado(Venta.EstadoVenta.COMPLETADA.toString()); // Usar el Enum para consistencia
                case "in_process", "pending" -> venta.setEstado("PENDIENTE");
                case "rejected" -> venta.setEstado("RECHAZADA");
                default -> venta.setEstado("DESCONOCIDO");
            }
            ventaRepository.save(venta);

            return ResponseEntity.ok("Webhook procesado correctamente");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error procesando webhook: " + e.getMessage());
        }
    }
    // =========================================================
    // 🔴 ENDPOINTS DE ADMIN (requieren rol ADMIN)
    // =========================================================

    @GetMapping("/admin/payments/pagos")
    public List<RegistroPago> listarPagos() {
        return registroPagoRepository.findAll();
    }

    @GetMapping("/admin/payments/ventas")
    public List<Venta> listarVentas() {
        return ventaRepository.findAll();
    }

    // =========================================================
    // 🟢 ENDPOINTS PÚBLICOS (para callbacks de Mercado Pago)
    // =========================================================

    @GetMapping("/public/payments/success")
    public String pagoExitoso(@RequestParam Map<String, String> params) {
        // Aquí deberías redirigir a una página de éxito en tu frontend.
        // Ejemplo: return "redirect:https://tufrontend.com/pago/exitoso?payment_id=" + params.get("payment_id");
        return "Pago aprobado! Datos: " + params;
    }

    @GetMapping("/public/payments/failure")
    public String pagoFallido(@RequestParam Map<String, String> params) {
        // Redirigir a página de fallo en el frontend.
        return "Pago fallido. Datos: " + params;
    }

    @GetMapping("/public/payments/pending")
    public String pagoPendiente(@RequestParam Map<String, String> params) {
        // Redirigir a página de pago pendiente en el frontend.
        return "Pago pendiente. Datos: " + params;
    }
}
