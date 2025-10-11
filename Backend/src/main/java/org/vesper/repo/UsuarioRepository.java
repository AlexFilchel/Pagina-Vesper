package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Usuario;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByAuth0Id(String auth0Id);
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
}
