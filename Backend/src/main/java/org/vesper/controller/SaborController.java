package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.SaborRequest;
import org.vesper.dto.SaborResponse;
import org.vesper.service.SaborService;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestión de sabores de vapers.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SaborController {

    private final SaborService saborService;

    // =========================================================
    // 🟢 PÚBLICO
    // =========================================================

    @GetMapping("/public/sabores")
    public ResponseEntity<List<SaborResponse>> listarSaboresPublicos() {
        return ResponseEntity.ok(saborService.listarTodos());
    }

    @GetMapping("/public/sabores/{id}")
    public ResponseEntity<SaborResponse> obtenerSaborPublico(@PathVariable Long id) {
        return saborService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/public/sabores/buscar")
    public ResponseEntity<List<SaborResponse>> buscarSaboresPublicos(
            @RequestParam(required = false) String nombre) {

        if (nombre == null || nombre.isEmpty()) {
            return ResponseEntity.ok(saborService.listarTodos());
        }
        return ResponseEntity.ok(saborService.buscarPorNombre(nombre));
    }

    // =========================================================
    // 🟡 USUARIO
    // =========================================================

    @GetMapping("/user/sabores/favoritos")
    public ResponseEntity<List<SaborResponse>> obtenerSaboresFavoritos() {
        return ResponseEntity.ok(saborService.listarTodos());
    }

    // =========================================================
    // 🔴 ADMIN
    // =========================================================

    @PostMapping("/admin/sabores")
    public ResponseEntity<?> crearSabor(@Valid @RequestBody SaborRequest request) {
        try {
            return ResponseEntity.ok(saborService.crear(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/admin/sabores/{id}")
    public ResponseEntity<?> actualizarSabor(@PathVariable Long id,
                                             @Valid @RequestBody SaborRequest request) {
        try {
            return ResponseEntity.ok(saborService.actualizar(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/sabores/{id}")
    public ResponseEntity<?> eliminarSabor(@PathVariable Long id) {
        try {
            saborService.eliminar(id);
            return ResponseEntity.ok(Map.of("message", "Sabor eliminado correctamente"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}
