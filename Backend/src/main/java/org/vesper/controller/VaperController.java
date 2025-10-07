package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.VaperRequest;
import org.vesper.dto.VaperResponse;
import org.vesper.service.VaperService;

import java.util.List;

/**
 * Controlador REST para la gestión de vapers.
 * Proporciona endpoints CRUD y de búsqueda.
 */
@RestController
@RequestMapping("/api/vapers")
@RequiredArgsConstructor
public class VaperController {

    private final VaperService vaperService;

    /**
     * Endpoint para listar todos los vapers.
     *
     * @return Lista de vapers registrados
     */
    @GetMapping
    public ResponseEntity<List<VaperResponse>> listarVapers() {
        return ResponseEntity.ok(vaperService.listarVapers());
    }

    /**
     * Endpoint para obtener un vaper por su ID.
     *
     * @param id Identificador del vaper
     * @return Detalle del vaper encontrado
     */
    @GetMapping("/{id}")
    public ResponseEntity<VaperResponse> obtenerVaper(@PathVariable Long id) {
        return ResponseEntity.ok(vaperService.obtenerVaper(id));
    }

    /**
     * Endpoint para crear un nuevo vaper.
     *
     * @param request DTO con los datos del vaper
     * @return Vaper creado
     */
    @PostMapping
    public ResponseEntity<VaperResponse> crearVaper(@Valid @RequestBody VaperRequest request) {
        return ResponseEntity.ok(vaperService.crearVaper(request));
    }

    /**
     * Endpoint para actualizar un vaper existente.
     *
     * @param id      Identificador del vaper
     * @param request DTO con los datos actualizados
     * @return Vaper actualizado
     */
    @PutMapping("/{id}")
    public ResponseEntity<VaperResponse> actualizarVaper(
            @PathVariable Long id,
            @Valid @RequestBody VaperRequest request) {
        return ResponseEntity.ok(vaperService.actualizarVaper(id, request));
    }

    /**
     * Endpoint para eliminar un vaper.
     *
     * @param id Identificador del vaper
     * @return Mensaje de confirmación
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> eliminarVaper(@PathVariable Long id) {
        vaperService.eliminarVaper(id);
        return ResponseEntity.ok("Vaper eliminado correctamente");
    }
}
