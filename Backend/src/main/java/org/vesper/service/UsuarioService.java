package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.vesper.dto.*;
import org.vesper.entity.Rol;
import org.vesper.entity.Usuario;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.UsuarioRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
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
                .rol(Rol.USER) // rol por defecto
                .activo(true)
                .fechaCreacion(LocalDateTime.now())
                .build();
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

    // ======================= MÉTODOS DE GESTIÓN PARA SUPERADMIN =======================

    /**
     * Lista todos los usuarios del sistema.
     *
     * @return Lista de todos los usuarios
     */
    public List<UserResponse> listarTodosLosUsuarios() {
        return usuarioRepository.findAll().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lista solo los administradores (ADMIN y SUPERADMIN).
     *
     * @return Lista de administradores
     */
    public List<UserResponse> listarAdministradores() {
        return usuarioRepository.findAll().stream()
                .filter(usuario -> usuario.getRol() == Rol.ADMIN || usuario.getRol() == Rol.SUPERADMIN)
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene un usuario por su ID.
     *
     * @param id ID del usuario
     * @return Usuario encontrado
     * @throws ResourceNotFoundException si no existe
     */
    public UserResponse obtenerUsuarioPorId(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        return toUserResponse(usuario);
    }

    /**
     * Crea un nuevo administrador (ADMIN o SUPERADMIN).
     *
     * @param request DTO con los datos del administrador
     * @return Usuario creado
     * @throws AlreadyExistsException si el email ya existe
     */
    public UserResponse crearAdministrador(AdminCreateRequest request) {
        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new AlreadyExistsException("Ya existe un usuario con el email: " + request.getEmail());
        }

        // Validar que solo se puedan crear ADMIN o SUPERADMIN
        if (request.getRol() == Rol.USER) {
            throw new IllegalArgumentException("No se puede crear un usuario con rol USER desde este endpoint");
        }

        Usuario usuario = Usuario.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(request.getRol())
                .activo(true)
                .fechaCreacion(LocalDateTime.now())
                .build();

        Usuario guardado = usuarioRepository.save(usuario);
        return toUserResponse(guardado);
    }

    /**
     * Actualiza un usuario existente.
     *
     * @param id ID del usuario
     * @param request DTO con los datos actualizados
     * @return Usuario actualizado
     * @throws ResourceNotFoundException si no existe
     * @throws AlreadyExistsException si el email ya existe en otro usuario
     */
    public UserResponse actualizarUsuario(Long id, AdminUpdateRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));

        // Verificar si el email ya existe en otro usuario
        Optional<Usuario> usuarioConEmail = usuarioRepository.findByEmail(request.getEmail());
        if (usuarioConEmail.isPresent() && !usuarioConEmail.get().getId().equals(id)) {
            throw new AlreadyExistsException("Ya existe un usuario con el email: " + request.getEmail());
        }

        // Actualizar campos
        usuario.setNombre(request.getNombre());
        usuario.setApellido(request.getApellido());
        usuario.setEmail(request.getEmail());
        usuario.setRol(request.getRol());
        usuario.setActivo(request.isActivo());

        Usuario actualizado = usuarioRepository.save(usuario);
        return toUserResponse(actualizado);
    }

    /**
     * Elimina un usuario por su ID.
     *
     * @param id ID del usuario
     * @throws ResourceNotFoundException si no existe
     * @throws IllegalArgumentException si se intenta eliminar el último SUPERADMIN
     */
    public void eliminarUsuario(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));

        // Verificar que no se elimine el último SUPERADMIN
        if (usuario.getRol() == Rol.SUPERADMIN) {
            long countSuperAdmins = usuarioRepository.findAll().stream()
                    .filter(u -> u.getRol() == Rol.SUPERADMIN)
                    .count();
            if (countSuperAdmins <= 1) {
                throw new IllegalArgumentException("No se puede eliminar el último SUPERADMIN del sistema");
            }
        }

        usuarioRepository.deleteById(id);
    }

    /**
     * Activa o desactiva un usuario.
     *
     * @param id ID del usuario
     * @param activo Estado a establecer
     * @return Usuario actualizado
     * @throws ResourceNotFoundException si no existe
     */
    public UserResponse cambiarEstadoUsuario(Long id, boolean activo) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));

        usuario.setActivo(activo);
        Usuario actualizado = usuarioRepository.save(usuario);
        return toUserResponse(actualizado);
    }

    /**
     * Busca usuarios por rol.
     *
     * @param rol Rol a buscar
     * @return Lista de usuarios con ese rol
     */
    public List<UserResponse> buscarUsuariosPorRol(Rol rol) {
        return usuarioRepository.findAll().stream()
                .filter(usuario -> usuario.getRol() == rol)
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    // ======================= MÉTODOS AUXILIARES PRIVADOS =======================

    /**
     * Convierte una entidad Usuario a UserResponse.
     */
    private UserResponse toUserResponse(Usuario usuario) {
        return new UserResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getRol(),
                usuario.isActivo(),
                usuario.getFechaCreacion()
        );
    }
}
