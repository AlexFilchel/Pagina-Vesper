package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.entity.Usuario;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.UsuarioRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    /**
     * Guarda o actualiza un usuario proveniente de Auth0 (autoregistro).
     */
    public Usuario registrarOActualizarDesdeAuth0(String auth0Id, String email, String nombre, String apellido) {
        return usuarioRepository.findByAuth0Id(auth0Id)
                .map(usuario -> {
                    usuario.setEmail(email);
                    usuario.setNombre(nombre);
                    usuario.setApellido(apellido);
                    return usuarioRepository.save(usuario);
                })
                .orElseGet(() -> usuarioRepository.save(
                        Usuario.builder()
                                .auth0Id(auth0Id)
                                .email(email)
                                .nombre(nombre)
                                .apellido(apellido)
                                .build()
                ));
    }

    /**
     * Lista todos los usuarios (solo para admins).
     */
    public List<Usuario> listarUsuarios() {
        return usuarioRepository.findAll();
    }

    /**
     * Obtiene un usuario por ID.
     */
    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
    }
}
