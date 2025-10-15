package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.UserResponse;
import org.vesper.dto.UserRequest;
import org.vesper.entity.Usuario;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.UsuarioRepository;

import jakarta.transaction.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;

    /**
     * Registra al usuario autenticado en la base de datos si aún no existe.
     */
    @Transactional
    public UserResponse registrarUsuario(String auth0Id, String email, String nombre, String nickname) {
        Optional<Usuario> existente = usuarioRepository.findByAuth0Id(auth0Id);
        if (existente.isPresent()) {
            return toResponse(existente.get());
        }

        Usuario nuevo = Usuario.builder()
            .auth0Id(auth0Id)
            .email(email != null ? email : "sin_email@vesper.com")
            .nombre(nombre != null ? nombre : (nickname != null ? nickname : null))
            .apellido(null)
            .telefono(null)
            .dni(null)
            .build();

        usuarioRepository.save(nuevo);
        return toResponse(nuevo);
    }

    /**
     * Devuelve los datos del usuario autenticado.
     */
    public UserResponse obtenerPerfil(String auth0Id) {
        Usuario usuario = usuarioRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con Auth0 ID: " + auth0Id));
        return toResponse(usuario);
    }

    // =========================================================
    // 🧩 MÉTODO AUXILIAR
    // =========================================================

    private UserResponse toResponse(Usuario usuario) {
        return new UserResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getDni(),
                usuario.getTelefono()
        );
    }

    @Transactional
    public UserResponse actualizarPerfil(String auth0Id, UserRequest request) {
        Usuario usuario = usuarioRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con Auth0 ID: " + auth0Id));

        usuario.setNombre(request.getNombre());
        usuario.setApellido(request.getApellido());
        usuario.setTelefono(request.getTelefono());
        usuario.setDni(request.getDni());

        usuarioRepository.save(usuario);
        return toResponse(usuario);
    }
}
