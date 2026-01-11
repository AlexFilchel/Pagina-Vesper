package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.vesper.dto.ImagenResponse;
import org.vesper.dto.VapeRequest;
import org.vesper.dto.VapeResponse;
import org.vesper.dto.VapeSaborRequest;
import org.vesper.dto.VapeSaborResponse;
import org.vesper.entity.Imagen;
import org.vesper.entity.Sabor;
import org.vesper.entity.Vape;
import org.vesper.entity.VapeSabor;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.SaborRepository;
import org.vesper.repo.VapeRepository;

// import jakarta.transaction.Transactional; 
// Removida importación manual de jakarta para usar springframework si es preferible, o mantener consistencia.
// En este caso, para no romper código existente que usa jakarta.transaction.Transactional, mantendremos ambos 
// o unificaremos. Spring recomienda org.springframework.transaction.annotation.Transactional para readOnly.
// Tu código usa jakarta.transaction.Transactional en métodos. 
// La anotación de clase readOnly solo funciona con la de Spring.
// Voy a usar la de Spring para la clase.

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
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

    @Transactional
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

    @Transactional
    public VapeResponse actualizarVape(Long id, VapeRequest request) {
        Vape existente = vapeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vape no encontrado con id: " + id));

        applyRequestToEntity(existente, request);

        Vape actualizado = vapeRepository.save(existente);
        return toResponse(actualizado);
    }

    @Transactional
    public VapeResponse actualizarVape(Long id, VapeRequest request, List<MultipartFile> files) {
        Vape existente = vapeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vape no encontrado con id: " + id));

        applyRequestToEntity(existente, request);

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


    @Transactional
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
        Vape vape = new Vape();
        vape.setImagenes(new ArrayList<>()); // se completará si se suben archivos
        applyRequestToEntity(vape, request);
        return vape;
    }

    public VapeResponse toResponse(Vape vape) {
        Set<VapeSaborResponse> sabores = Optional.ofNullable(vape.getVapeSabores())
                .orElseGet(Collections::emptySet)
                .stream()
                .map(this::toSaborResponse)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        int stockTotal = sabores.stream()
                .map(VapeSaborResponse::getStock)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();

        List<ImagenResponse> imagenResponses = Optional.ofNullable(vape.getImagenes())
                .orElseGet(Collections::emptyList)
                .stream()
                .map(imagen -> new ImagenResponse(imagen.getId(), imagen.getUrl()))
                .collect(Collectors.toList());

        return VapeResponse.builder()
                .id(vape.getId())
                .nombre(vape.getNombre())
                .precio(vape.getPrecio())
                .descripcion(vape.getDescripcion())
                .pitadas(vape.getPitadas())
                .modos(vape.getModos())
                .marca(vape.getMarca())
                .stock(stockTotal)
                .sabores(sabores)
                .imagenes(imagenResponses)
                .build();
    }

    private void applyRequestToEntity(Vape vape, VapeRequest request) {
        vape.setNombre(request.getNombre());
        vape.setPrecio(request.getPrecio());
        vape.setDescripcion(request.getDescripcion());
        vape.setMarca(request.getMarca());
        vape.setPitadas(request.getPitadas());
        vape.setModos(request.getModos());

        Set<VapeSabor> vapeSabores = buildVapeSabores(vape, request.getSabores());
        vape.setVapeSabores(vapeSabores);

        int totalStock = vapeSabores.stream()
                .map(VapeSabor::getStock)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        vape.setStock(totalStock);
    }

    private Set<VapeSabor> buildVapeSabores(Vape vape, Set<VapeSaborRequest> saborRequests) {
        if (saborRequests == null || saborRequests.isEmpty()) {
            return Collections.emptySet();
        }

        return saborRequests.stream()
                .filter(Objects::nonNull)
                .filter(request -> StringUtils.hasText(request.getNombre()))
                .map(request -> {
                    Sabor sabor = saborRepository.findByNombreIgnoreCase(request.getNombre())
                            .orElseGet(() -> saborRepository.save(Sabor.builder().nombre(request.getNombre()).build()));
                    Integer stock = Optional.ofNullable(request.getStock()).orElse(0);
                    return VapeSabor.builder()
                            .vape(vape)
                            .sabor(sabor)
                            .stock(stock)
                            .build();
                })
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private VapeSaborResponse toSaborResponse(VapeSabor vapeSabor) {
        Sabor sabor = vapeSabor.getSabor();
        return VapeSaborResponse.builder()
                .id(vapeSabor.getId())
                .saborId(sabor != null ? sabor.getId() : null)
                .nombre(sabor != null ? sabor.getNombre() : null)
                .stock(vapeSabor.getStock())
                .build();
    }
}
