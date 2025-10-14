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

    // =========================================================
    // 🟡 MÉTODOS DE USUARIO (se usan en /api/user/...)
    // =========================================================

    /**
     * Lista todos los domicilios del usuario autenticado.
     */
    public List<DomicilioResponse> listarPorAuth0Id(String auth0Id) {
        Usuario usuario = obtenerUsuarioPorAuth0Id(auth0Id);
        return usuario.getDomicilios().stream()
                .sorted(Comparator.comparing(Domicilio::getId))
                .map(this::toResponse)
                .toList();
    }

    /**
     * Agrega un nuevo domicilio al usuario autenticado.
     */
    public DomicilioResponse agregarDomicilioPorAuth0Id(String auth0Id, DomicilioRequest request) {
        Usuario usuario = obtenerUsuarioPorAuth0Id(auth0Id);
        Domicilio domicilio = new Domicilio();
        applyRequest(domicilio, request);
        domicilio.setUsuario(usuario);
        Domicilio guardado = domicilioRepository.save(domicilio);
        return toResponse(guardado);
    }

    /**
     * Actualiza un domicilio existente perteneciente al usuario autenticado.
     */
    public DomicilioResponse actualizarDomicilioPorAuth0Id(String auth0Id, Long domicilioId, DomicilioRequest request) {
        Usuario usuario = obtenerUsuarioPorAuth0Id(auth0Id);
        Domicilio domicilio = obtenerDomicilioParaUsuario(usuario, domicilioId);
        applyRequest(domicilio, request);
        Domicilio actualizado = domicilioRepository.save(domicilio);
        return toResponse(actualizado);
    }

    /**
     * Elimina un domicilio del usuario autenticado.
     */
    public void eliminarDomicilioPorAuth0Id(String auth0Id, Long domicilioId) {
        Usuario usuario = obtenerUsuarioPorAuth0Id(auth0Id);
        Domicilio domicilio = obtenerDomicilioParaUsuario(usuario, domicilioId);
        domicilioRepository.delete(domicilio);
    }

    // =========================================================
    // 🔴 MÉTODOS DE ADMINISTRADOR (se usan en /api/admin/...)
    // =========================================================

    /**
     * Lista todos los domicilios del sistema (solo ADMIN).
     */
    public List<DomicilioResponse> listarTodos() {
        return domicilioRepository.findAll().stream()
                .sorted(Comparator.comparing(Domicilio::getId))
                .map(this::toResponse)
                .toList();
    }

    /**
     * Elimina un domicilio sin verificar usuario (solo ADMIN).
     */
    public void eliminarPorAdmin(Long domicilioId) {
        Domicilio domicilio = domicilioRepository.findById(domicilioId)
                .orElseThrow(() -> new ResourceNotFoundException("Domicilio no encontrado con id: " + domicilioId));
        domicilioRepository.delete(domicilio);
    }

    // =========================================================
    // 🧩 MÉTODOS AUXILIARES PRIVADOS
    // =========================================================

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

    private Usuario obtenerUsuarioPorAuth0Id(String auth0Id) {
        return usuarioRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con Auth0 ID: " + auth0Id));
    }

    private Domicilio obtenerDomicilioParaUsuario(Usuario usuario, Long domicilioId) {
        Domicilio domicilio = domicilioRepository.findById(domicilioId)
                .orElseThrow(() -> new ResourceNotFoundException("Domicilio no encontrado con id: " + domicilioId));

        if (!domicilio.getUsuario().getId().equals(usuario.getId())) {
            throw new UnauthorizedException("El domicilio no pertenece al usuario autenticado");
        }
        return domicilio;
    }
}
