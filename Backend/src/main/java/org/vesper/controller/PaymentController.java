package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
