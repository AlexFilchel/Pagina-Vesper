package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.vesper.dto.ImagenResponse;
import org.vesper.dto.PerfumeRequest;
import org.vesper.dto.PerfumeResponse;
import org.vesper.entity.Imagen;
import org.vesper.entity.Perfume;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;

import org.vesper.repo.PerfumeRepository;

import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerfumeService {

    private final PerfumeRepository perfumeRepository;

    private final CloudinaryService cloudinaryService;

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
    @Transactional
    public PerfumeResponse crearPerfume(PerfumeRequest request, List<MultipartFile> files) {
        // Validar duplicado por nombre
        if (perfumeRepository.existsByNombre(request.getNombre())) {
            throw new AlreadyExistsException("Ya existe un perfume con el nombre: " + request.getNombre());
        }

        Perfume perfume = toEntity(request);

        if (files != null && !files.isEmpty()) {
            List<Imagen> imagenes = new ArrayList<>();
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;

                Map<String, String> uploadResult = cloudinaryService.subirImagen(file);
                Imagen imagen = new Imagen();
                imagen.setUrl(uploadResult.get("url"));
                imagen.setPublicId(uploadResult.get("public_id"));
                imagenes.add(imagen);
            }
            perfume.setImagenes(imagenes);
        }

        Perfume guardado = perfumeRepository.save(perfume);
        return toResponse(guardado);
    }

    /**
     * Actualiza un perfume existente (solo admins).
     */
    @Transactional
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
    @Transactional
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

    public PerfumeResponse toResponse(Perfume perfume) {
        List<ImagenResponse> imagenResponses = perfume.getImagenes().stream()
                .map(imagen -> new ImagenResponse(imagen.getId(), imagen.getUrl()))
                .collect(Collectors.toList());

        return PerfumeResponse.builder()
                .id(perfume.getId())
                .nombre(perfume.getNombre())
                .descripcion(perfume.getDescripcion())
                .marca(perfume.getMarca())
                .precio(perfume.getPrecio())
                .stock(perfume.getStock())
                .imagenes(imagenResponses)
                .volumen(perfume.getVolumen())
                .genero(perfume.getGenero())
                .notasPrincipales(perfume.getNotasPrincipales())
                .salida(perfume.getSalida())
                .corazon(perfume.getCorazon())
                .fondo(perfume.getFondo())
                .inspiracion(perfume.getInspiracion())
                .decant(perfume.getDecant())
                .fragancia(perfume.getFragancia())
                .ml(perfume.getMl())
                .build();
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
