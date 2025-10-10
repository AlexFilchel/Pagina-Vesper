package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Domicilio;

@Repository
public interface DomicilioRepository extends JpaRepository<Domicilio, Long> {
}
