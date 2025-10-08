package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.entity.Sabor;
import org.vesper.repo.SaborRepository;

import java.util.List;
import java.util.Optional;

/**
 * Controlador REST para la gestión de sabores.
 * Proporciona endpoints para listar y gestionar sabores de vapers.
 */
@RestController
@RequestMapping("/sabores")
@RequiredArgsConstructor
public class SaborController {

    private final SaborRepository saborRepository;

    /**
     * Endpoint para listar todos los sabores.
     *
     * @return Lista de sabores registrados
     */
    @GetMapping
    public ResponseEntity<List<Sabor>> listarSabores() {
        return ResponseEntity.ok(saborRepository.findAll());
    }

    /**
     * Endpoint para obtener un sabor por su ID.
     *
     * @param id Identificador del sabor
     * @return Detalle del sabor encontrado
     */
    @GetMapping("/{id}")
    public ResponseEntity<Sabor> obtenerSabor(@PathVariable Long id) {
        Optional<Sabor> sabor = saborRepository.findById(id);
        if (sabor.isPresent()) {
            return ResponseEntity.ok(sabor.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Endpoint para crear un nuevo sabor.
     *
     * @param sabor Datos del sabor
     * @return Sabor creado
     */
    @PostMapping
    public ResponseEntity<Sabor> crearSabor(@Valid @RequestBody Sabor sabor) {
        // Verificar si ya existe un sabor con ese nombre
        if (saborRepository.findByNombre(sabor.getNombre()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }
        
        Sabor guardado = saborRepository.save(sabor);
        return ResponseEntity.ok(guardado);
    }

    /**
     * Endpoint para actualizar un sabor existente.
     *
     * @param id    Identificador del sabor
     * @param sabor Datos actualizados del sabor
     * @return Sabor actualizado
     */
    @PutMapping("/{id}")
    public ResponseEntity<Sabor> actualizarSabor(
            @PathVariable Long id,
            @Valid @RequestBody Sabor sabor) {
        
        Optional<Sabor> existente = saborRepository.findById(id);
        if (existente.isPresent()) {
            sabor.setId(id);
            Sabor actualizado = saborRepository.save(sabor);
            return ResponseEntity.ok(actualizado);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Endpoint para eliminar un sabor.
     *
     * @param id Identificador del sabor
     * @return Mensaje de confirmación
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> eliminarSabor(@PathVariable Long id) {
        if (saborRepository.existsById(id)) {
            saborRepository.deleteById(id);
            return ResponseEntity.ok("Sabor eliminado correctamente");
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
