package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.VaperRequest;
import org.vesper.dto.VaperResponse;
import org.vesper.entity.Sabor;
import org.vesper.entity.Vaper;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.SaborRepository;
import org.vesper.repo.VaperRepository;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Servicio para la gestión de vapers.
 * Contiene la lógica de negocio y conversión de entidades a DTOs.
 */
@Service
@RequiredArgsConstructor
public class VaperService {

    private final VaperRepository vaperRepository;
    private final SaborRepository saborRepository;

    /**
     * Lista todos los vapers registrados.
     *
     * @return Lista de VaperResponse
     */
    public List<VaperResponse> listarVapers() {
        return vaperRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene un vaper por su ID.
     *
     * @param id Identificador del vaper
     * @return DTO del vaper encontrado
     * @throws ResourceNotFoundException si no existe
     */
    public VaperResponse obtenerVaper(Long id) {
        Vaper vaper = vaperRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vaper no encontrado con id: " + id));
        return toResponse(vaper);
    }

    /**
     * Crea un nuevo vaper a partir del DTO recibido.
     *
     * @param request DTO con los datos del vaper
     * @return DTO del vaper creado
     */
    public VaperResponse crearVaper(VaperRequest request) {
        Vaper vaper = toEntity(request);
        Vaper guardado = vaperRepository.save(vaper);
        return toResponse(guardado);
    }

    /**
     * Actualiza un vaper existente.
     *
     * @param id      Identificador del vaper
     * @param request DTO con los datos actualizados
     * @return DTO del vaper actualizado
     * @throws ResourceNotFoundException si no existe
     */
    public VaperResponse actualizarVaper(Long id, VaperRequest request) {
        Vaper existente = vaperRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vaper no encontrado con id: " + id));

        existente.setNombre(request.getNombre());
        existente.setPrecio(request.getPrecio());
        existente.setDescripcion(request.getDescripcion());
        //existente.setImagen(request.getImagen());
        existente.setPitadas(request.getPitadas());
        existente.setModos(request.getModos());

        if (request.getSaboresIds() != null) {
            Set<Sabor> sabores = saborRepository.findAllById(request.getSaboresIds()).stream().collect(Collectors.toSet());
            existente.setSabores(sabores);
        }

        Vaper actualizado = vaperRepository.save(existente);
        return toResponse(actualizado);
    }

    /**
     * Elimina un vaper por su ID.
     *
     * @param id Identificador del vaper
     * @throws ResourceNotFoundException si no existe
     */
    public void eliminarVaper(Long id) {
        if (!vaperRepository.existsById(id)) {
            throw new ResourceNotFoundException("Vaper no encontrado con id: " + id);
        }
        vaperRepository.deleteById(id);
    }

    // ---------------------------
    // Métodos auxiliares privados
    // ---------------------------

    private VaperResponse toResponse(Vaper vaper) {
        Set<String> sabores = vaper.getSabores().stream()
                .map(Sabor::getNombre)
                .collect(Collectors.toSet());

        return new VaperResponse(
                vaper.getId(),
                vaper.getNombre(),
                vaper.getPrecio(),
                vaper.getDescripcion(),
                null,
                vaper.getPitadas(),
                vaper.getModos(),
                sabores
        );
    }

    private Vaper toEntity(VaperRequest request) {
        Set<Sabor> sabores = request.getSaboresIds() != null
                ? saborRepository.findAllById(request.getSaboresIds()).stream().collect(Collectors.toSet())
                : Set.of();

        return Vaper.builder()
                .nombre(request.getNombre())
                .precio(request.getPrecio())
                .descripcion(request.getDescripcion())
                //.imagen(request.getImagen())
                .pitadas(request.getPitadas())
                .modos(request.getModos())
                .sabores(sabores)
                .build();
    }
}
