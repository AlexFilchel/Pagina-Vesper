package org.vesper.repo;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.vesper.entity.Usuario;

import java.util.Optional;

@Repository
public interface UsuarioRepository  extends JpaRepository<Usuario,Long> {
    boolean existsByEmail(String email);
    Optional<Usuario> findByNombre(String nombre);
    Optional<Usuario> findByEmail(String nombre);
}
