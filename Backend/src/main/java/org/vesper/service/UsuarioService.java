package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.vesper.dto.RegisterRequest;
import org.vesper.entity.Rol;
import org.vesper.entity.Usuario;
import org.vesper.repo.RolRepository;
import org.vesper.repo.UsuarioRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Registra un nuevo usuario con rol USER por defecto.
     *
     * @param request DTO con los datos del usuario a registrar
     * @return El usuario registrado
     * @throws RuntimeException si el email ya existe o no se encuentra el rol USER
     */
    public Usuario registrarUsuario(RegisterRequest request) {
        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("El usuario que ingreso ya existe.");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        Rol rol = rolRepository.findByNombre("USER")
                .orElseThrow(() -> new RuntimeException("Rol USER no encontrado"));

        usuario.getRoles().add(rol);

        return usuarioRepository.save(usuario);
    }

    /**
     * Busca un usuario por email.
     *
     * @param email Email del usuario
     * @return Optional con el usuario si existe
     */
    public Optional<Usuario> buscarPorEmail(String email) {
        return usuarioRepository.findByEmail(email);
    }

    /**
     * Actualiza la contraseña de un usuario.
     *
     * @param email Usuario a actualizar
     * @param nuevaPassword Nueva contraseña sin encriptar
     * @return Usuario con la contraseña actualizada
     * @throws RuntimeException si no se encuentra el usuario
     */
    public Usuario actualizarPassword(String email, String nuevaPassword) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        return usuarioRepository.save(usuario);
    }

    /**
     * Genera el token de recuperación de contraseña para un usuario.
     *
     * @param email Email del usuario
     * @param jwtService Servicio JWT para generar el token
     * @return Token generado
     * @throws RuntimeException si no se encuentra el usuario
     */
    public String generarTokenRecuperacion(String email, JwtService jwtService) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        return jwtService.generatePasswordResetToken(usuario.getEmail());
    }

    /**
     * Envía el correo de recuperación de contraseña usando el EmailService.
     *
     * @param email Email del usuario
     * @param resetLink Link de recuperación
     * @param emailService Servicio de envío de emails
     */
    public void enviarEmailRecuperacion(String email, String resetLink, EmailService emailService) {
        emailService.sendPasswordResetEmail(email, resetLink);
    }
}
