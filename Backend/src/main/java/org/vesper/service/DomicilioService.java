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
     * (Versión simple, sin email. Mantiene compatibilidad con controladores antiguos)
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
     * Agrega un nuevo domicilio y crea el usuario automáticamente si no existe.
     * (Versión mejorada con soporte de email extraído del JWT)
     */
    public DomicilioResponse agregarDomicilioPorAuth0Id(String auth0Id, String email, DomicilioRequest request) {
        Usuario usuario = obtenerUsuarioPorAuth0Id(auth0Id, email);
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

    /**
     * Obtiene un usuario existente o lanza excepción si no existe.
     */
    private Usuario obtenerUsuarioPorAuth0Id(String auth0Id) {
        return usuarioRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con Auth0 ID: " + auth0Id));
    }

    /**
     * Obtiene un usuario existente o lo crea automáticamente con datos mínimos.
     */
    private Usuario obtenerUsuarioPorAuth0Id(String auth0Id, String email) {
        return usuarioRepository.findByAuth0Id(auth0Id)
                .orElseGet(() -> usuarioRepository.save(
                        Usuario.builder()
                                .auth0Id(auth0Id)
                                .email(email != null ? email : "sin_email@vesper.com")
                                .nombre("Pendiente")
                                .apellido("Pendiente")
                                .telefono(0)
                                .dni(0)
                                .build()
                ));
    }

    /**
     * Valida que el domicilio pertenezca al usuario autenticado.
     */
    private Domicilio obtenerDomicilioParaUsuario(Usuario usuario, Long domicilioId) {
        Domicilio domicilio = domicilioRepository.findById(domicilioId)
                .orElseThrow(() -> new ResourceNotFoundException("Domicilio no encontrado con id: " + domicilioId));

        if (!domicilio.getUsuario().getId().equals(usuario.getId())) {
            throw new UnauthorizedException("El domicilio no pertenece al usuario autenticado");
        }
        return domicilio;
    }
}
