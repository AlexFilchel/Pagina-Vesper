package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.vesper.dto.VapeRequest;
import org.vesper.dto.VapeResponse;
import org.vesper.service.VapeService;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestión de vapes (dispositivos electrónicos).
 * Estructura dividida por niveles de acceso:
 * - /api/public/... → acceso sin autenticación
 * - /api/user/...   → acceso con sesión
 * - /api/admin/...  → acceso restringido a ADMIN
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VapeController {

    private final VapeService vapeService;

    // =========================================================
    // 🟢 ENDPOINTS PÚBLICOS
    // =========================================================

    /**
     * Lista todos los vapes disponibles para el catálogo público.
     */
    @GetMapping("/public/vapes")
    public ResponseEntity<List<VapeResponse>> listarVapesPublicos() {
        return ResponseEntity.ok(vapeService.listarVapes());
    }

    /**
     * Obtiene un vape por su ID (acceso público).
     */
    @GetMapping("/public/vapes/{id}")
    public ResponseEntity<VapeResponse> obtenerVapePublico(@PathVariable Long id) {
        return ResponseEntity.ok(vapeService.obtenerVape(id));
    }

    /**
     * Busca vapes por nombre, sabor, pitadas o rango de precio.
     */
    @GetMapping("/public/vapes/buscar")
    public ResponseEntity<List<VapeResponse>> buscarVapesPublicos(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String sabor,
            @RequestParam(required = false) Integer minPitadas,
            @RequestParam(required = false) Integer maxPitadas,
            @RequestParam(required = false) Double precioMin,
            @RequestParam(required = false) Double precioMax) {

        // orden de prioridad: nombre → sabor → pitadas → precio
        if (nombre != null) {
            return ResponseEntity.ok(vapeService.buscarPorNombre(nombre));
        }
        if (sabor != null) {
            return ResponseEntity.ok(vapeService.buscarPorSabor(sabor));
        }
        if (minPitadas != null && maxPitadas != null) {
            return ResponseEntity.ok(vapeService.buscarPorPitadas(minPitadas, maxPitadas));
        }
        if (precioMin != null && precioMax != null) {
            return ResponseEntity.ok(vapeService.buscarPorPrecio(precioMin, precioMax));
        }

        // Si no hay filtros, devolver todos
        return ResponseEntity.ok(vapeService.listarVapes());
    }

    // =========================================================
    // 🟡 ENDPOINTS DE USUARIO (requieren login)
    // =========================================================

    /**
     * Ejemplo: obtener recomendaciones de vapes para el usuario autenticado.
     */
    @GetMapping("/user/vapes/recomendados")
    public ResponseEntity<List<VapeResponse>> obtenerVapesRecomendados() {
        // lógica futura (ejemplo: personalización según historial)
        return ResponseEntity.ok(vapeService.listarVapes());
    }

    // =========================================================
    // 🔴 ENDPOINTS DE ADMIN (requieren rol ADMIN)
    // =========================================================

    /**
     * Crea un nuevo vape (solo administradores).
     */
    @PostMapping(value = "/admin/vapes", consumes = {"multipart/form-data"})
    public ResponseEntity<VapeResponse> crearVape(
            @RequestPart("producto") @Valid VapeRequest request,
            @RequestPart("files") List<MultipartFile> files) {
        return ResponseEntity.ok(vapeService.crearVape(request, files));
    }

    /**
     * Actualiza un vape existente (solo administradores).
     */
    @PutMapping(value = "/admin/vapes/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<VapeResponse> actualizarVape(
        @PathVariable Long id,
        @RequestPart("producto") @Valid VapeRequest request,
        @RequestPart(value = "files", required = false) List<MultipartFile> files) {

    return ResponseEntity.ok(vapeService.actualizarVape(id, request, files));
    }


    /**
     * Elimina un vape (solo administradores).
     */
    @DeleteMapping("/admin/vapes/{id}")
    public ResponseEntity<Map<String, String>> eliminarVape(@PathVariable Long id) {
        vapeService.eliminarVape(id);
        return ResponseEntity.ok(Map.of("message", "Vape eliminado correctamente"));
    }


}
