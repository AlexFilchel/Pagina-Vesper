package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.*;
import org.vesper.entity.Rol;
import org.vesper.service.UsuarioService;

import java.util.List;

/**
 * Controlador REST para la gestión de usuarios.
 * Solo accesible para usuarios con rol SUPERADMIN.
 * Proporciona funcionalidades completas de gestión de usuarios y administradores.
 */
@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class UserManagementController {

    private final UsuarioService usuarioService;

    // ======================= ENDPOINTS DE CONSULTA =======================

    /**
     * Lista todos los usuarios del sistema.
     * Solo accesible para SUPERADMIN.
     *
     * @return Lista de todos los usuarios
     */
    @GetMapping
    public ResponseEntity<List<UserResponse>> listarTodosLosUsuarios() {
        return ResponseEntity.ok(usuarioService.listarTodosLosUsuarios());
    }

    /**
     * Lista solo los administradores (ADMIN y SUPERADMIN).
     * Solo accesible para SUPERADMIN.
     *
     * @return Lista de administradores
     */
    @GetMapping("/administradores")
    public ResponseEntity<List<UserResponse>> listarAdministradores() {
        return ResponseEntity.ok(usuarioService.listarAdministradores());
    }

    /**
     * Obtiene un usuario por su ID.
     * Solo accesible para SUPERADMIN.
     *
     * @param id ID del usuario
     * @return Usuario encontrado
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> obtenerUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.obtenerUsuarioPorId(id));
    }

    /**
     * Busca usuarios por rol.
     * Solo accesible para SUPERADMIN.
     *
     * @param rol Rol a buscar (USER, ADMIN, SUPERADMIN)
     * @return Lista de usuarios con ese rol
     */
    @GetMapping("/buscar")
    public ResponseEntity<List<UserResponse>> buscarUsuariosPorRol(@RequestParam Rol rol) {
        return ResponseEntity.ok(usuarioService.buscarUsuariosPorRol(rol));
    }

    // ======================= ENDPOINTS DE GESTIÓN =======================

    /**
     * Crea un nuevo administrador (ADMIN o SUPERADMIN).
     * Solo accesible para SUPERADMIN.
     *
     * @param request DTO con los datos del administrador
     * @return Usuario creado
     */
    @PostMapping
    public ResponseEntity<UserResponse> crearAdministrador(@Valid @RequestBody AdminCreateRequest request) {
        return ResponseEntity.ok(usuarioService.crearAdministrador(request));
    }

    /**
     * Actualiza un usuario existente.
     * Solo accesible para SUPERADMIN.
     *
     * @param id      ID del usuario
     * @param request DTO con los datos actualizados
     * @return Usuario actualizado
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> actualizarUsuario(
            @PathVariable Long id,
            @Valid @RequestBody AdminUpdateRequest request) {
        return ResponseEntity.ok(usuarioService.actualizarUsuario(id, request));
    }

    /**
     * Elimina un usuario por su ID.
     * Solo accesible para SUPERADMIN.
     * No permite eliminar el último SUPERADMIN del sistema.
     *
     * @param id ID del usuario
     * @return Mensaje de confirmación
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> eliminarUsuario(@PathVariable Long id) {
        usuarioService.eliminarUsuario(id);
        return ResponseEntity.ok("Usuario eliminado correctamente");
    }

    /**
     * Activa un usuario.
     * Solo accesible para SUPERADMIN.
     *
     * @param id ID del usuario
     * @return Usuario actualizado
     */
    @PatchMapping("/{id}/activar")
    public ResponseEntity<UserResponse> activarUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.cambiarEstadoUsuario(id, true));
    }

    /**
     * Desactiva un usuario.
     * Solo accesible para SUPERADMIN.
     *
     * @param id ID del usuario
     * @return Usuario actualizado
     */
    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<UserResponse> desactivarUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.cambiarEstadoUsuario(id, false));
    }

    // ======================= ENDPOINTS DE ESTADÍSTICAS =======================

    /**
     * Obtiene estadísticas de usuarios.
     * Solo accesible para SUPERADMIN.
     *
     * @return Estadísticas del sistema
     */
    @GetMapping("/estadisticas")
    public ResponseEntity<Object> obtenerEstadisticas() {
        List<UserResponse> todosUsuarios = usuarioService.listarTodosLosUsuarios();
        
        long total = todosUsuarios.size();
        long activos = todosUsuarios.stream().mapToLong(u -> u.isActivo() ? 1 : 0).sum();
        long inactivos = total - activos;
        long admins = todosUsuarios.stream().mapToLong(u -> 
            (u.getRol() == Rol.ADMIN || u.getRol() == Rol.SUPERADMIN) ? 1 : 0).sum();
        long superAdmins = todosUsuarios.stream().mapToLong(u -> 
            u.getRol() == Rol.SUPERADMIN ? 1 : 0).sum();

        return ResponseEntity.ok(new Object() {
            public final long totalUsuarios = total;
            public final long usuariosActivos = activos;
            public final long usuariosInactivos = inactivos;
            public final long administradores = admins;
            public final long superAdministradores = superAdmins;
        });
    }
}
