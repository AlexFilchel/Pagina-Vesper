package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.VentaRequest;
import org.vesper.dto.VentaResponse;
import org.vesper.service.VentaService;

import java.util.List;

/**
 * Controlador REST para la gestión de ventas.
 * <p>
 * Las rutas están organizadas por nivel de acceso:
 * <ul>
 *     <li><b>/api/public/ventas</b>: acceso libre (si aplica).</li>
 *     <li><b>/api/user/ventas</b>: requiere autenticación (rol USER o ADMIN).</li>
 *     <li><b>/api/admin/ventas</b>: requiere rol ADMIN.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;

    // =========================================================
    // 🟡 ENDPOINTS DE USUARIO (requieren login)
    // =========================================================

    /**
     * Registra una nueva venta asociada al usuario autenticado.
     *
     * @param request Datos de la venta.
     * @param jwt     Token JWT validado del usuario autenticado.
     * @return Venta registrada con éxito.
     */
    @PostMapping("/user/ventas")
    public ResponseEntity<VentaResponse> registrarVenta(
            @Valid @RequestBody VentaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ventaService.registrarVenta(request, jwt));
    }

    /**
     * Lista todas las ventas pertenecientes al usuario autenticado.
     *
     * @param jwt Token JWT validado del usuario autenticado.
     * @return Lista de ventas del usuario.
     */
    @GetMapping("/user/ventas")
    public ResponseEntity<List<VentaResponse>> listarVentasUsuario(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ventaService.listarPorUsuario(jwt));
    }

    // =========================================================
    // 🔴 ENDPOINTS DE ADMIN (requieren rol ADMIN)
    // =========================================================

    /**
     * Lista todas las ventas registradas en el sistema.
     *
     * @return Lista de todas las ventas (solo administradores).
     */
    @GetMapping("/admin/ventas")
    public ResponseEntity<List<VentaResponse>> listarTodasLasVentasAdmin() {
        return ResponseEntity.ok(ventaService.listarTodas());
    }

    /**
     * Obtiene una venta específica por su ID (solo administradores).
     *
     * @param id ID de la venta.
     * @return Detalle de la venta solicitada.
     */
    @GetMapping("/admin/ventas/{id}")
    public ResponseEntity<VentaResponse> obtenerVentaAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(ventaService.obtenerPorId(id));
    }
}
