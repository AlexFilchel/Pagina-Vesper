package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.vesper.dto.PerfumeRequest;
import org.vesper.dto.PerfumeResponse;
import org.vesper.service.PerfumeService;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestión de perfumes.
 * Endpoints divididos por nivel de acceso:
 * - /api/public/... : acceso sin autenticación
 * - /api/user/...   : requiere sesión
 * - /api/admin/...  : requiere rol ADMIN
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PerfumeController {

    private final PerfumeService perfumeService;

    // =========================================================
    // 🟢 ENDPOINTS PÚBLICOS (acceso libre)
    // =========================================================

    /**
     * Lista todos los perfumes disponibles para el catálogo público.
     */
    @GetMapping("/public/perfumes")
    public ResponseEntity<List<PerfumeResponse>> listarPerfumesPublicos() {
        return ResponseEntity.ok(perfumeService.listarPerfumes());
    }

    /**
     * Obtiene un perfume específico por su ID (acceso público).
     */
    @GetMapping("/public/perfumes/{id}")
    public ResponseEntity<PerfumeResponse> obtenerPerfumePublico(@PathVariable Long id) {
        return ResponseEntity.ok(perfumeService.obtenerPerfume(id));
    }

    /**
     * Busca perfumes mediante filtros opcionales (nombre, género, precio, marca, etc.).
     */
    @GetMapping("/public/perfumes/buscar")
    public ResponseEntity<List<PerfumeResponse>> buscarPerfumesPublicos(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String genero,
            @RequestParam(required = false) String notasPrincipales,
            @RequestParam(required = false) String marca,
            @RequestParam(required = false) String volumen,
            @RequestParam(required = false) Boolean decant,
            @RequestParam(required = false) Double precioMin,
            @RequestParam(required = false) Double precioMax) {

        return ResponseEntity.ok(
                perfumeService.buscarPerfumesAvanzado(
                        nombre, genero, notasPrincipales, precioMin, precioMax, marca
                )
        );
    }

    // =========================================================
    // 🟡 ENDPOINTS DE USUARIO (requieren login)
    // =========================================================

    /**
     * Ejemplo: perfumes recomendados para el usuario autenticado.
     * Podés implementar lógica personalizada en el futuro.
     */
    @GetMapping("/user/perfumes/recomendados")
    public ResponseEntity<List<PerfumeResponse>> obtenerPerfumesRecomendados() {
        return ResponseEntity.ok(perfumeService.listarPerfumes());
    }

    // =========================================================
    // 🔴 ENDPOINTS DE ADMIN (requieren rol ADMIN)
    // =========================================================

    /**
     * Crea un nuevo perfume (solo para administradores).
     */
    @PostMapping(value = "/admin/perfumes", consumes = {"multipart/form-data"})
    public ResponseEntity<PerfumeResponse> crearPerfume(
            @RequestPart("producto") @Valid PerfumeRequest request,
            @RequestPart("files") List<MultipartFile> files) {
        return ResponseEntity.ok(perfumeService.crearPerfume(request, files));
    }

    /**
     * Actualiza un perfume existente (solo para administradores).
     */
    @PutMapping("/admin/perfumes/{id}")
    public ResponseEntity<PerfumeResponse> actualizarPerfume(
            @PathVariable Long id,
            @Valid @RequestBody PerfumeRequest request) {
        return ResponseEntity.ok(perfumeService.actualizarPerfume(id, request));
    }

    /**
     * Elimina un perfume (solo para administradores).
     */
    @DeleteMapping("/admin/perfumes/{id}")
    public ResponseEntity<Map<String, String>> eliminarPerfume(@PathVariable Long id) {
        perfumeService.eliminarPerfume(id);
        return ResponseEntity.ok(Map.of("message", "Perfume eliminado correctamente"));
    }


}
