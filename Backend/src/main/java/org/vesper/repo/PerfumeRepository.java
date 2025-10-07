package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Perfume;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerfumeRepository extends JpaRepository<Perfume, Long> {

    /**
     * Verifica si existe un perfume con el nombre dado.
     *
     * @param nombre Nombre del perfume
     * @return true si existe
     */
    boolean existsByNombre(String nombre);

    /**
     * Busca perfumes por género.
     *
     * @param genero Género del perfume
     * @return Lista de perfumes
     */
    List<Perfume> findByGenero(String genero);

    /**
     * Lista solo los perfumes activos.
     *
     * @return Lista de perfumes activos
     */
    List<Perfume> findByActivoTrue();

    /**
     * Busca un perfume por nombre (opcional).
     *
     * @param nombre Nombre del perfume
     * @return Optional con el perfume encontrado
     */
    Optional<Perfume> findByNombre(String nombre);

}
