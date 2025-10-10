package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Sabor;

import java.util.List;
import java.util.Optional;

@Repository
public interface SaborRepository extends JpaRepository<Sabor, Long> {

    /**
     * Busca un sabor exacto por nombre (coincidencia completa, sin importar mayúsculas/minúsculas).
     * Usado para validaciones al crear un nuevo sabor.
     */
    Optional<Sabor> findByNombreIgnoreCase(String nombre);

    /**
     * Busca sabores cuyo nombre contenga una palabra parcial (por ejemplo: "frut" encuentra "Frutilla").
     * Usado en /api/public/sabores/buscar?nombre=
     */
    List<Sabor> findByNombreContainingIgnoreCase(String nombre);
}
