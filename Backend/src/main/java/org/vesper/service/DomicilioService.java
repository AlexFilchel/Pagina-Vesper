package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.DomicilioRequest;
import org.vesper.dto.DomicilioResponse;
import org.vesper.entity.Domicilio;
import org.vesper.entity.Usuario;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.exception.UnauthorizedException;
import org.vesper.repo.DomicilioRepository;
import org.vesper.repo.UsuarioRepository;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DomicilioService {

    private final DomicilioRepository domicilioRepository;
    private final UsuarioRepository usuarioRepository;

    public List<DomicilioResponse> listarPorUsuario(Long usuarioId) {
        Usuario usuario = obtenerUsuario(usuarioId);
        return usuario.getDomicilios().stream()
                .sorted(Comparator.comparing(Domicilio::getId))
                .map(this::toResponse)
                .toList();
    }

    public DomicilioResponse agregarDomicilio(Long usuarioId, DomicilioRequest request) {
        Usuario usuario = obtenerUsuario(usuarioId);
        Domicilio domicilio = new Domicilio();
        applyRequest(domicilio, request);
        domicilio.setUsuario(usuario);
        Domicilio guardado = domicilioRepository.save(domicilio);
        return toResponse(guardado);
    }

    public DomicilioResponse actualizarDomicilio(Long usuarioId, Long domicilioId, DomicilioRequest request) {
        Domicilio domicilio = obtenerDomicilioParaUsuario(usuarioId, domicilioId);
        applyRequest(domicilio, request);
        Domicilio actualizado = domicilioRepository.save(domicilio);
        return toResponse(actualizado);
    }

    public void eliminarDomicilio(Long usuarioId, Long domicilioId) {
        Domicilio domicilio = obtenerDomicilioParaUsuario(usuarioId, domicilioId);
        domicilioRepository.delete(domicilio);
    }

    private void applyRequest(Domicilio domicilio, DomicilioRequest request) {
        domicilio.setNombre(request.getNombre());
        domicilio.setApellido(request.getApellido());
        domicilio.setTelefono(request.getTelefono());
        domicilio.setDni(request.getDni());
        domicilio.setCalle(request.getCalle());
        domicilio.setNumero(request.getNumero());
        domicilio.setPiso(request.getPiso());
        domicilio.setDepartamento(request.getDepartamento());
        domicilio.setTorre(request.getTorre());
        domicilio.setEntreCalles(request.getEntreCalles());
        domicilio.setProvincia(request.getProvincia());
        domicilio.setLocalidad(request.getLocalidad());
        domicilio.setCodigoPostal(request.getCodigoPostal());
        domicilio.setObservaciones(request.getObservaciones());
    }

    private DomicilioResponse toResponse(Domicilio domicilio) {
        return new DomicilioResponse(
                domicilio.getId(),
                domicilio.getNombre(),
                domicilio.getApellido(),
                domicilio.getTelefono(),
                domicilio.getDni(),
                domicilio.getCalle(),
                domicilio.getNumero(),
                domicilio.getPiso(),
                domicilio.getDepartamento(),
                domicilio.getTorre(),
                domicilio.getEntreCalles(),
                domicilio.getProvincia(),
                domicilio.getLocalidad(),
                domicilio.getCodigoPostal(),
                domicilio.getObservaciones()
        );
    }

    private Usuario obtenerUsuario(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + usuarioId));
    }

    private Domicilio obtenerDomicilioParaUsuario(Long usuarioId, Long domicilioId) {
        Domicilio domicilio = domicilioRepository.findById(domicilioId)
                .orElseThrow(() -> new ResourceNotFoundException("Domicilio no encontrado con id: " + domicilioId));

        if (!domicilio.getUsuario().getId().equals(usuarioId)) {
            throw new UnauthorizedException("El domicilio no pertenece al usuario indicado");
        }
        return domicilio;
    }
}
