package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.vesper.entity.Usuario;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.UsuarioRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;

    /**
     * Devuelve el usuario logeado a partir del JWT
     * @return Usuario correspondiente al token JWT
     * @throws ResourceNotFoundException si no se encuentra el usuario
     */
    public Usuario getUsuarioLogeado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String emailUsuario = auth.getName(); // según UserDetails, esto es el email
        return usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    }
}
