package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Imagen;

/**
 * Repositorio que administra las operaciones de persistencia de {@link Imagen}.
 */
@Repository
public interface ImagenRepository extends JpaRepository<Imagen, Long> {
}
