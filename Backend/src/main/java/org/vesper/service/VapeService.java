package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.VapeRequest;
import org.vesper.dto.VapeResponse;
import org.vesper.entity.Sabor;
import org.vesper.entity.Vape;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.SaborRepository;
import org.vesper.repo.VapeRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Servicio para la gestión de vapes (dispositivos electrónicos).
 * Contiene la lógica de negocio, validaciones y conversión DTO <-> Entidad.
 */
@Service
@RequiredArgsConstructor
public class VapeService {

    private final VapeRepository vapeRepository;
    private final SaborRepository saborRepository;

    // =========================================================
    // MÉTODOS CRUD
    // =========================================================

    /**
     * Lista todos los vapes registrados.
     */
    public List<VapeResponse> listarVapes() {
        return vapeRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene un vape por su ID.
     */
    public VapeResponse obtenerVape(Long id) {
        Vape vape = vapeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vape no encontrado con id: " + id));
        return toResponse(vape);
    }

    /**
     * Crea un nuevo vape.
     */
    public VapeResponse crearVape(VapeRequest request) {
        if (vapeRepository.existsByNombre(request.getNombre())) {
            throw new AlreadyExistsException("Ya existe un vape con el nombre: " + request.getNombre());
        }

        Vape vape = toEntity(request);
        Vape guardado = vapeRepository.save(vape);
        return toResponse(guardado);
    }

    /**
     * Actualiza un vape existente.
     */
    public VapeResponse actualizarVape(Long id, VapeRequest request) {
        Vape existente = vapeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vape no encontrado con id: " + id));

        existente.setNombre(request.getNombre());
        existente.setPrecio(request.getPrecio());
        existente.setDescripcion(request.getDescripcion());
        existente.setMarca(request.getMarca());
        existente.setStock(request.getStock() != null ? request.getStock() : existente.getStock());
        existente.setPitadas(request.getPitadas());
        existente.setModos(request.getModos());

        if (request.getSaboresIds() != null) {
            Set<Sabor> sabores = new HashSet<>(saborRepository.findAllById(request.getSaboresIds()));
            existente.setSabores(sabores);
        }

        Vape actualizado = vapeRepository.save(existente);
        return toResponse(actualizado);
    }

    /**
     * Elimina un vape por su ID.
     */
    public void eliminarVape(Long id) {
        if (!vapeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Vape no encontrado con id: " + id);
        }
        vapeRepository.deleteById(id);
    }

    // =========================================================
    // MÉTODOS DE BÚSQUEDA
    // =========================================================

    /**
     * Busca vapes por nombre (búsqueda parcial).
     */
    public List<VapeResponse> buscarPorNombre(String nombre) {
        return vapeRepository.findByNombreContainingIgnoreCase(nombre).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca vapes por rango de pitadas.
     */
    public List<VapeResponse> buscarPorPitadas(Integer minPitadas, Integer maxPitadas) {
        return vapeRepository.findByPitadasBetween(minPitadas, maxPitadas).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca vapes por sabor.
     */
    public List<VapeResponse> buscarPorSabor(String saborNombre) {
        return vapeRepository.findBySaborNombre(saborNombre).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca vapes por rango de precio.
     */
    public List<VapeResponse> buscarPorPrecio(Double precioMin, Double precioMax) {
        return vapeRepository.findByPrecioBetween(precioMin, precioMax).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // MAPEOS PRIVADOS
    // =========================================================

    private VapeResponse toResponse(Vape vape) {
        Set<String> sabores = vape.getSabores().stream()
                .map(Sabor::getNombre)
                .collect(Collectors.toSet());

        return new VapeResponse(
                vape.getId(),
                vape.getNombre(),
                vape.getPrecio(),
                vape.getDescripcion(),
                null,
                vape.getPitadas(),
                vape.getModos(),
                sabores
        );
    }

    private Vape toEntity(VapeRequest request) {
        Set<Sabor> sabores = request.getSaboresIds() != null
                ? new HashSet<>(saborRepository.findAllById(request.getSaboresIds()))
                : new HashSet<>();

        return Vape.builder()
                .nombre(request.getNombre())
                .precio(request.getPrecio())
                .descripcion(request.getDescripcion())
                .marca(request.getMarca())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .pitadas(request.getPitadas())
                .modos(request.getModos())
                .sabores(sabores)
                .build();
    }
}
