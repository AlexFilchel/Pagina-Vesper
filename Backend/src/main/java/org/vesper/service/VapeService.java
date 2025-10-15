package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.vesper.dto.ImagenResponse;
import org.vesper.dto.VapeRequest;
import org.vesper.dto.VapeResponse;
import org.vesper.entity.Imagen;
import org.vesper.entity.Sabor;
import org.vesper.entity.Vape;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.SaborRepository;
import org.vesper.repo.VapeRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VapeService {

    private final VapeRepository vapeRepository;
    private final SaborRepository saborRepository;
    private final CloudinaryService cloudinaryService;

    // ================================
    // CRUD
    // ================================

    public List<VapeResponse> listarVapes() {
        return vapeRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public VapeResponse obtenerVape(Long id) {
        Vape vape = vapeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vape no encontrado con id: " + id));
        return toResponse(vape);
    }

    public VapeResponse crearVape(VapeRequest request, List<MultipartFile> files) {
        if (vapeRepository.existsByNombre(request.getNombre())) {
            throw new AlreadyExistsException("Ya existe un vape con el nombre: " + request.getNombre());
        }

        Vape vape = toEntity(request);

        // Subida de imágenes a Cloudinary (opcional)
        if (files != null && !files.isEmpty()) {
            List<Imagen> imagenes = new ArrayList<>();
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) continue;
                Map<String, String> uploadResult = cloudinaryService.subirImagen(file);
                Imagen imagen = new Imagen();
                imagen.setUrl(uploadResult.get("url"));
                imagen.setPublicId(uploadResult.get("public_id"));
                imagenes.add(imagen);
            }
            vape.setImagenes(imagenes);
        }

        Vape guardado = vapeRepository.save(vape);
        return toResponse(guardado);
    }

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

        // Actualizar sabores por nombre (crea si no existe)
        if (request.getSabores() != null) {
            Set<Sabor> nuevosSabores = request.getSabores().stream()
                    .filter(Objects::nonNull)
                    .map(nombre -> saborRepository.findByNombreIgnoreCase(nombre)
                            .orElseGet(() -> saborRepository.save(Sabor.builder().nombre(nombre).build())))
                    .collect(Collectors.toSet());
            existente.setSabores(nuevosSabores);
        }

        Vape actualizado = vapeRepository.save(existente);
        return toResponse(actualizado);
    }

    public VapeResponse actualizarVape(Long id, VapeRequest request, List<MultipartFile> files) {
    Vape existente = vapeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Vape no encontrado con id: " + id));

    existente.setNombre(request.getNombre());
    existente.setPrecio(request.getPrecio());
    existente.setDescripcion(request.getDescripcion());
    existente.setMarca(request.getMarca());
    existente.setStock(request.getStock() != null ? request.getStock() : existente.getStock());
    existente.setPitadas(request.getPitadas());
    existente.setModos(request.getModos());

    // 🔹 Actualizar sabores
    if (request.getSabores() != null) {
        Set<Sabor> nuevosSabores = request.getSabores().stream()
                .filter(Objects::nonNull)
                .map(nombre -> saborRepository.findByNombreIgnoreCase(nombre)
                        .orElseGet(() -> saborRepository.save(Sabor.builder().nombre(nombre).build())))
                .collect(Collectors.toSet());
        existente.setSabores(nuevosSabores);
    }

    // 🔹 Si se suben nuevas imágenes, reemplazarlas
    if (files != null && !files.isEmpty()) {
        List<Imagen> nuevasImagenes = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            Map<String, String> uploadResult = cloudinaryService.subirImagen(file);
            Imagen imagen = new Imagen();
            imagen.setUrl(uploadResult.get("url"));
            imagen.setPublicId(uploadResult.get("public_id"));
            nuevasImagenes.add(imagen);
        }
        existente.setImagenes(nuevasImagenes);
    }

    Vape actualizado = vapeRepository.save(existente);
    return toResponse(actualizado);
}


    public void eliminarVape(Long id) {
        if (!vapeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Vape no encontrado con id: " + id);
        }
        vapeRepository.deleteById(id);
    }

    // ================================
    // BÚSQUEDAS
    // ================================

    public List<VapeResponse> buscarPorNombre(String nombre) {
        return vapeRepository.findByNombreContainingIgnoreCase(nombre)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<VapeResponse> buscarPorPitadas(Integer minPitadas, Integer maxPitadas) {
        return vapeRepository.findByPitadasBetween(minPitadas, maxPitadas)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<VapeResponse> buscarPorSabor(String saborNombre) {
        return vapeRepository.findBySaborNombre(saborNombre)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<VapeResponse> buscarPorPrecio(Double precioMin, Double precioMax) {
        return vapeRepository.findByPrecioBetween(precioMin, precioMax)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ================================
    // MAPEOS
    // ================================

    /** Mapea el DTO de entrada a entidad, resolviendo sabores por nombre. */
    private Vape toEntity(VapeRequest request) {
        // Resolver set de sabores (crea si no existe)
        Set<Sabor> sabores = Optional.ofNullable(request.getSabores())
                .orElseGet(Collections::emptySet)
                .stream()
                .filter(Objects::nonNull)
                .map(nombre -> saborRepository.findByNombreIgnoreCase(nombre)
                        .orElseGet(() -> saborRepository.save(Sabor.builder().nombre(nombre).build())))
                .collect(Collectors.toSet());

        Vape vape = new Vape();
        vape.setNombre(request.getNombre());
        vape.setPrecio(request.getPrecio());
        vape.setDescripcion(request.getDescripcion());
        vape.setMarca(request.getMarca());
        vape.setStock(request.getStock() != null ? request.getStock() : 0);
        vape.setPitadas(request.getPitadas());
        vape.setModos(request.getModos());
        vape.setSabores(sabores);
        vape.setImagenes(new ArrayList<>()); // se completará si se suben archivos
        return vape;
    }

    private VapeResponse toResponse(Vape vape) {
        Set<String> sabores = Optional.ofNullable(vape.getSabores())
                .orElseGet(Collections::emptySet)
                .stream()
                .map(Sabor::getNombre)
                .collect(Collectors.toSet());

        List<ImagenResponse> imagenResponses = Optional.ofNullable(vape.getImagenes())
                .orElseGet(Collections::emptyList)
                .stream()
                .map(imagen -> new ImagenResponse(imagen.getId(), imagen.getUrl()))
                .collect(Collectors.toList());

        return new VapeResponse(
                vape.getId(),
                vape.getNombre(),
                vape.getPrecio(),
                vape.getDescripcion(),
                vape.getPitadas(),
                vape.getModos(),
                sabores,
                imagenResponses
        );
    }
}
