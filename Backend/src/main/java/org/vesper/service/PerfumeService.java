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

    // ---------------------------
    // Métodos públicos
    // ---------------------------

    public List<PerfumeResponse> listarPerfumes() {
        return perfumeRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public PerfumeResponse obtenerPerfume(Long id) {
        Perfume perfume = perfumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfume no encontrado con id: " + id));
        return toResponse(perfume);
    }

    public PerfumeResponse crearPerfume(PerfumeRequest request) {
        // Validar duplicado por nombre
        if (perfumeRepository.existsByNombre(request.getNombre())) {
            throw new AlreadyExistsException("Ya existe un perfume con el nombre: " + request.getNombre());
        }

        Perfume perfume = toEntity(request);
        Perfume guardado = perfumeRepository.save(perfume);
        return toResponse(guardado);
    }

    public PerfumeResponse actualizarPerfume(Long id, PerfumeRequest request) {
        Perfume existente = perfumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfume no encontrado con id: " + id));

        // Actualizar solo campos editables
        existente.setNombre(request.getNombre());
        existente.setPrecio(request.getPrecio());
        existente.setDescripcion(request.getDescripcion());
        existente.setMarca(request.getMarca());
        if (request.getStock() != null) {
            existente.setStock(request.getStock());
        }
        existente.setVolumen(request.getVolumen());
        existente.setGenero(request.getGenero());
        existente.setNotasPrincipales(request.getNotasPrincipales());
        existente.setFamiliaOlfativa(request.getFamiliaOlfativa());
        existente.setSalida(request.getSalida());
        existente.setCorazon(request.getCorazon());
        existente.setFondo(request.getFondo());
        existente.setInspiracion(request.getInspiracion());
        existente.setDecant(request.isDecant());
        existente.setFragancia(request.getFragancia());
        existente.setMl(request.getMl());

        Perfume actualizado = perfumeRepository.save(existente);
        return toResponse(actualizado);
    }

    public void eliminarPerfume(Long id) {
        if (!perfumeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Perfume no encontrado con id: " + id);
        }
        perfumeRepository.deleteById(id);
    }

    /**
     * Busca perfumes por nombre (búsqueda parcial).
     */
    public List<PerfumeResponse> buscarPorNombre(String nombre) {
        return perfumeRepository.findByNombreContainingIgnoreCase(nombre).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca perfumes por género.
     */
    public List<PerfumeResponse> buscarPorGenero(String genero) {
        return perfumeRepository.findByGenero(genero).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca perfumes por familia olfativa.
     */
    public List<PerfumeResponse> buscarPorFamiliaOlfativa(String familiaOlfativa) {
        return perfumeRepository.findByFamiliaOlfativa(familiaOlfativa).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca perfumes por rango de precio.
     */
    public List<PerfumeResponse> buscarPorPrecio(Double precioMin, Double precioMax) {
        return perfumeRepository.findByPrecioBetween(precioMin, precioMax).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca perfumes por marca.
     */
    public List<PerfumeResponse> buscarPorMarca(String marca) {
        return perfumeRepository.findByMarca(marca).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca perfumes por volumen.
     */
    public List<PerfumeResponse> buscarPorVolumen(String volumen) {
        return perfumeRepository.findByVolumen(volumen).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca perfumes que sean decant o no.
     */
    public List<PerfumeResponse> buscarPorDecant(boolean decant) {
        return perfumeRepository.findByDecant(decant).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }


    /**
     * Búsqueda avanzada con múltiples criterios.
     */
    public List<PerfumeResponse> buscarPerfumesAvanzado(String nombre, String genero, String familiaOlfativa, 
                                                       Double precioMin, Double precioMax, String marca) {
        return perfumeRepository.buscarPerfumesAvanzado(nombre, genero, familiaOlfativa, precioMin, precioMax, marca)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ---------------------------
    // Métodos privados
    // ---------------------------

    private PerfumeResponse toResponse(Perfume perfume) {
        return new PerfumeResponse(
                perfume.getId(),
                perfume.getNombre(),
                perfume.getPrecio(),
                perfume.getDescripcion(),
                perfume.getVolumen(),
                perfume.getGenero(),
                perfume.getNotasPrincipales(),
                perfume.getFamiliaOlfativa(),
                perfume.getSalida(),
                perfume.getCorazon(),
                perfume.getFondo(),
                perfume.getInspiracion(),
                perfume.isDecant(),
                perfume.getFragancia(),
                perfume.getMl()
        );
    }

    private Perfume toEntity(PerfumeRequest request) {
        return Perfume.builder()
                .nombre(request.getNombre())
                .precio(request.getPrecio())
                .descripcion(request.getDescripcion())
                .marca(request.getMarca())
                .stock(request.getStock() != null ? request.getStock() : 0)
                //.imagen(null) // imagen temporalmente ignorada
                .volumen(request.getVolumen())
                .genero(request.getGenero())
                .notasPrincipales(request.getNotasPrincipales())
                .familiaOlfativa(request.getFamiliaOlfativa())
                .salida(request.getSalida())
                .corazon(request.getCorazon())
                .fondo(request.getFondo())
                .inspiracion(request.getInspiracion())
                .decant(request.isDecant())
                .fragancia(request.getFragancia())
                .ml(request.getMl())
                .build();
    }
}
