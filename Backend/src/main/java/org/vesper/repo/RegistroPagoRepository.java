package org.vesper.repo;

import org.vesper.entity.RegistroPago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RegistroPagoRepository extends JpaRepository<RegistroPago, Long> {
    Optional<RegistroPago> findByMpPaymentId(String mpPaymentId);
}
