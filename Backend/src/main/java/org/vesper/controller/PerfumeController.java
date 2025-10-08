package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.PerfumeRequest;
import org.vesper.dto.PerfumeResponse;
import org.vesper.service.PerfumeService;

import java.util.List;

/**
 * Controlador REST para la gestión de perfumes.
 * Proporciona endpoints CRUD y de búsqueda.
 */
@RestController
@RequestMapping("/perfumes")
@RequiredArgsConstructor
public class PerfumeController {

    private final PerfumeService perfumeService;

    /**
     * Endpoint para listar todos los perfumes.
     *
     * @return Lista de perfumes registrados
     */
    @GetMapping
    public ResponseEntity<List<PerfumeResponse>> listarPerfumes() {
        return ResponseEntity.ok(perfumeService.listarPerfumes());
    }

    /**
     * Endpoint para obtener un perfume por su ID.
     *
     * @param id Identificador del perfume
     * @return Detalle del perfume encontrado
     */
    @GetMapping("/{id}")
    public ResponseEntity<PerfumeResponse> obtenerPerfume(@PathVariable Long id) {
        return ResponseEntity.ok(perfumeService.obtenerPerfume(id));
    }

    /**
     * Endpoint para crear un nuevo perfume.
     *
     * @param request DTO con los datos del perfume
     * @return Perfume creado
     */
    @PostMapping
    public ResponseEntity<PerfumeResponse> crearPerfume(@Valid @RequestBody PerfumeRequest request) {
        return ResponseEntity.ok(perfumeService.crearPerfume(request));
    }

    /**
     * Endpoint para actualizar un perfume existente.
     *
     * @param id      Identificador del perfume
     * @param request DTO con los datos actualizados
     * @return Perfume actualizado
     */
    @PutMapping("/{id}")
    public ResponseEntity<PerfumeResponse> actualizarPerfume(
            @PathVariable Long id,
            @Valid @RequestBody PerfumeRequest request) {
        return ResponseEntity.ok(perfumeService.actualizarPerfume(id, request));
    }

    /**
     * Endpoint para eliminar un perfume.
     *
     * @param id Identificador del perfume
     * @return Mensaje de confirmación
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> eliminarPerfume(@PathVariable Long id) {
        perfumeService.eliminarPerfume(id);
        return ResponseEntity.ok("Perfume eliminado correctamente");
    }

    // ======================= ENDPOINTS DE BÚSQUEDA =======================

    /**
     * Endpoint para buscar perfumes por nombre (búsqueda parcial).
     */
    @GetMapping("/buscar")
    public ResponseEntity<List<PerfumeResponse>> buscarPerfumes(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String genero,
            @RequestParam(required = false) String familiaOlfativa,
            @RequestParam(required = false) String marca,
            @RequestParam(required = false) String volumen,
            @RequestParam(required = false) Boolean decant,
            @RequestParam(required = false) Double precioMin,
            @RequestParam(required = false) Double precioMax) {
        
        // Si se proporcionan múltiples criterios, usar búsqueda avanzada
        if (nombre != null || genero != null || familiaOlfativa != null || 
            marca != null || precioMin != null || precioMax != null) {
            return ResponseEntity.ok(perfumeService.buscarPerfumesAvanzado(
                    nombre, genero, familiaOlfativa, precioMin, precioMax, marca));
        }
        
        // Búsquedas específicas
        if (nombre != null) {
            return ResponseEntity.ok(perfumeService.buscarPorNombre(nombre));
        }
        if (genero != null) {
            return ResponseEntity.ok(perfumeService.buscarPorGenero(genero));
        }
        if (familiaOlfativa != null) {
            return ResponseEntity.ok(perfumeService.buscarPorFamiliaOlfativa(familiaOlfativa));
        }
        if (marca != null) {
            return ResponseEntity.ok(perfumeService.buscarPorMarca(marca));
        }
        if (volumen != null) {
            return ResponseEntity.ok(perfumeService.buscarPorVolumen(volumen));
        }
        if (decant != null) {
            return ResponseEntity.ok(perfumeService.buscarPorDecant(decant));
        }
        if (precioMin != null && precioMax != null) {
            return ResponseEntity.ok(perfumeService.buscarPorPrecio(precioMin, precioMax));
        }
        
        // Si no hay criterios, devolver todos los perfumes
        return ResponseEntity.ok(perfumeService.listarPerfumes());
    }

}
