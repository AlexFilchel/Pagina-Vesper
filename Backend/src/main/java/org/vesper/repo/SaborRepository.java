package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Sabor;

import java.util.Optional;

@Repository
public interface SaborRepository extends JpaRepository<Sabor, Long> {
    Optional<Sabor> findByNombre(String nombre);
}
