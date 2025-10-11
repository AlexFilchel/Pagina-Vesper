package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.DomicilioRequest;
import org.vesper.dto.DomicilioResponse;
import org.vesper.entity.Domicilio;
import org.vesper.entity.Usuario;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.DomicilioRepository;
import org.vesper.repo.UsuarioRepository;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DomicilioService {

    private final DomicilioRepository domicilioRepository;
    private final UsuarioRepository usuarioRepository;

    /**
     * Agrega un domicilio a un usuario.
     */
    public DomicilioResponse agregarDomicilio(Long usuarioId, DomicilioRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + usuarioId));

        Domicilio domicilio = new Domicilio();
        domicilio.setCalle(request.getCalle());
        domicilio.setLocalidad(request.getLocalidad());
        domicilio.setProvincia(request.getProvincia());
        domicilio.setCodigoPostal(request.getCodigoPostal());

        Domicilio guardado = domicilioRepository.save(domicilio);
        usuario.getDomicilios().add(guardado);
        usuarioRepository.save(usuario);

        return toResponse(guardado);
    }

    /**
     * Lista los domicilios de un usuario.
     */
    public Set<DomicilioResponse> listarPorUsuario(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + usuarioId));

        return usuario.getDomicilios().stream()
                .map(this::toResponse)
                .collect(Collectors.toSet());
    }

    /**
     * Elimina un domicilio asociado a un usuario.
     */
    public void eliminarDomicilio(Long usuarioId, Long domicilioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + usuarioId));

        Domicilio domicilio = domicilioRepository.findById(domicilioId)
                .orElseThrow(() -> new ResourceNotFoundException("Domicilio no encontrado con id: " + domicilioId));

        usuario.getDomicilios().remove(domicilio);
        usuarioRepository.save(usuario);
    }

    // ===================== MÉTODO AUXILIAR =====================

    private DomicilioResponse toResponse(Domicilio domicilio) {
        return new DomicilioResponse(
                domicilio.getId(),
                domicilio.getCalle(),
                domicilio.getLocalidad(),
                domicilio.getProvincia(),
                domicilio.getCodigoPostal()
        );
    }
}
