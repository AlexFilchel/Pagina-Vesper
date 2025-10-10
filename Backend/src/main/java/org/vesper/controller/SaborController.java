package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.entity.Sabor;
import org.vesper.repo.SaborRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controlador REST para la gestión de sabores de vapers.
 * Estructurado según niveles de acceso:
 * - /api/public/... → acceso libre
 * - /api/user/...   → requiere sesión
 * - /api/admin/...  → requiere rol ADMIN
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SaborController {

    private final SaborRepository saborRepository;

    // =========================================================
    // 🟢 ENDPOINTS PÚBLICOS (acceso sin autenticación)
    // =========================================================

    /**
     * Lista todos los sabores disponibles (acceso público).
     */
    @GetMapping("/public/sabores")
    public ResponseEntity<List<Sabor>> listarSaboresPublicos() {
        return ResponseEntity.ok(saborRepository.findAll());
    }

    /**
     * Obtiene un sabor por su ID (acceso público).
     */
    @GetMapping("/public/sabores/{id}")
    public ResponseEntity<Sabor> obtenerSaborPublico(@PathVariable Long id) {
        return saborRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Busca sabores por nombre (parcial o completo).
     */
    @GetMapping("/public/sabores/buscar")
    public ResponseEntity<List<Sabor>> buscarSaboresPublicos(
            @RequestParam(required = false) String nombre) {

        if (nombre == null || nombre.isEmpty()) {
            return ResponseEntity.ok(saborRepository.findAll());
        }

        return ResponseEntity.ok(saborRepository.findByNombreContainingIgnoreCase(nombre));
    }

    // =========================================================
    // 🟡 ENDPOINTS DE USUARIO (requieren login)
    // =========================================================

    /**
     * Ejemplo de endpoint privado para usuarios autenticados.
     * (Podrías personalizarlo en el futuro, por ejemplo, para guardar sabores favoritos).
     */
    @GetMapping("/user/sabores/favoritos")
    public ResponseEntity<List<Sabor>> obtenerSaboresFavoritos() {
        // Placeholder: podés implementar la lógica de usuario más adelante.
        return ResponseEntity.ok(saborRepository.findAll());
    }

    // =========================================================
    // 🔴 ENDPOINTS DE ADMIN (requieren rol ADMIN)
    // =========================================================

    /**
     * Crea un nuevo sabor (solo para administradores).
     */
    @PostMapping("/admin/sabores")
    public ResponseEntity<?> crearSabor(@Valid @RequestBody Sabor sabor) {
        if (saborRepository.findByNombreIgnoreCase(sabor.getNombre()).isPresent()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ya existe un sabor con el nombre: " + sabor.getNombre()));
        }

        Sabor guardado = saborRepository.save(sabor);
        return ResponseEntity.ok(guardado);
    }

    /**
     * Actualiza un sabor existente (solo para administradores).
     */
    @PutMapping("/admin/sabores/{id}")
    public ResponseEntity<?> actualizarSabor(
            @PathVariable Long id,
            @Valid @RequestBody Sabor sabor) {

        Optional<Sabor> existente = saborRepository.findById(id);
        if (existente.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Sabor no encontrado con id: " + id));
        }

        sabor.setId(id);
        Sabor actualizado = saborRepository.save(sabor);
        return ResponseEntity.ok(actualizado);
    }

    /**
     * Elimina un sabor (solo para administradores).
     */
    @DeleteMapping("/admin/sabores/{id}")
    public ResponseEntity<Map<String, String>> eliminarSabor(@PathVariable Long id) {
        if (!saborRepository.existsById(id)) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Sabor no encontrado con id: " + id));
        }

        saborRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Sabor eliminado correctamente"));
    }
}
