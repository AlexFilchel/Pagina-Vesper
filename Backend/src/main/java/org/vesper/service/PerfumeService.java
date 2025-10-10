package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.PerfumeRequest;
import org.vesper.dto.PerfumeResponse;
import org.vesper.entity.Perfume;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.PerfumeRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerfumeService {

    private final PerfumeRepository perfumeRepository;

    // =========================================================
    // MÉTODOS PÚBLICOS
    // =========================================================

    /**
     * Devuelve la lista completa de perfumes.
     */
    public List<PerfumeResponse> listarPerfumes() {
        return perfumeRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Devuelve un perfume por su ID.
     */
    public PerfumeResponse obtenerPerfume(Long id) {
        Perfume perfume = perfumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfume no encontrado con id: " + id));
        return toResponse(perfume);
    }

    /**
     * Crea un nuevo perfume (solo admins).
     */
    public PerfumeResponse crearPerfume(PerfumeRequest request) {
        // Validar duplicado por nombre
        if (perfumeRepository.existsByNombre(request.getNombre())) {
            throw new AlreadyExistsException("Ya existe un perfume con el nombre: " + request.getNombre());
        }

        Perfume perfume = toEntity(request);
        Perfume guardado = perfumeRepository.save(perfume);
        return toResponse(guardado);
    }

    /**
     * Actualiza un perfume existente (solo admins).
     */
    public PerfumeResponse actualizarPerfume(Long id, PerfumeRequest request) {
        Perfume existente = perfumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfume no encontrado con id: " + id));

        existente.setNombre(request.getNombre());
        existente.setPrecio(request.getPrecio());
        existente.setDescripcion(request.getDescripcion());
        existente.setMarca(request.getMarca());
        existente.setStock(request.getStock() != null ? request.getStock() : existente.getStock());
        existente.setVolumen(request.getVolumen());
        existente.setGenero(request.getGenero());
        existente.setNotasPrincipales(request.getNotasPrincipales());
        existente.setSalida(request.getSalida());
        existente.setCorazon(request.getCorazon());
        existente.setFondo(request.getFondo());
        existente.setInspiracion(request.getInspiracion());
        existente.setDecant(request.getDecant());
        existente.setFragancia(request.getFragancia());
        existente.setMl(request.getMl());

        Perfume actualizado = perfumeRepository.save(existente);
        return toResponse(actualizado);
    }

    /**
     * Elimina un perfume existente por ID (solo admins).
     */
    public void eliminarPerfume(Long id) {
        if (!perfumeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Perfume no encontrado con id: " + id);
        }
        perfumeRepository.deleteById(id);
    }

    // =========================================================
    // MÉTODOS DE BÚSQUEDA
    // =========================================================

    /**
     * Búsqueda avanzada por filtros opcionales:
     * nombre, género, notas principales, rango de precio y marca.
     */
    public List<PerfumeResponse> buscarPerfumesAvanzado(String nombre,
                                                        String genero,
                                                        String notasPrincipales,
                                                        Double precioMin,
                                                        Double precioMax,
                                                        String marca) {

        return perfumeRepository.buscarPerfumesAvanzado(nombre, genero, notasPrincipales, precioMin, precioMax, marca)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // MÉTODOS PRIVADOS (mapeo DTO ↔ Entidad)
    // =========================================================

    private PerfumeResponse toResponse(Perfume perfume) {
        return new PerfumeResponse(
                perfume.getId(),
                perfume.getNombre(),
                perfume.getPrecio(),
                perfume.getDescripcion(),
                perfume.getVolumen(),
                perfume.getGenero(),
                perfume.getNotasPrincipales(),
                perfume.getSalida(),
                perfume.getCorazon(),
                perfume.getFondo(),
                perfume.getInspiracion(),
                perfume.getDecant(),
                perfume.getFragancia(),
                perfume.getMl(),
                perfume.getMarca(),
                perfume.getStock()
        );
    }

    private Perfume toEntity(PerfumeRequest request) {
        return Perfume.builder()
                .nombre(request.getNombre())
                .precio(request.getPrecio())
                .descripcion(request.getDescripcion())
                .marca(request.getMarca())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .volumen(request.getVolumen())
                .genero(request.getGenero())
                .notasPrincipales(request.getNotasPrincipales())
                .salida(request.getSalida())
                .corazon(request.getCorazon())
                .fondo(request.getFondo())
                .inspiracion(request.getInspiracion())
                .decant(request.getDecant())
                .fragancia(request.getFragancia())
                .ml(request.getMl())
                .build();
    }
}
