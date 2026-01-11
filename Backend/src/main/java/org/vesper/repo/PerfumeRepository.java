package org.vesper.repo;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.vesper.entity.Perfume;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerfumeRepository extends JpaRepository<Perfume, Long> {

    @Override
    @EntityGraph(attributePaths = "imagenes")
    List<Perfume> findAll();

    @Override
    @EntityGraph(attributePaths = "imagenes")
    Optional<Perfume> findById(Long id);

    // Verifica si existe un perfume con el nombre dado
    boolean existsByNombre(String nombre);

    // Busca un perfume por nombre exacto
    @EntityGraph(attributePaths = "imagenes")
    Optional<Perfume> findByNombre(String nombre);

    // Busca perfumes por género
    @EntityGraph(attributePaths = "imagenes")
    List<Perfume> findByGenero(String genero);

    // Busca perfumes por marca
    @EntityGraph(attributePaths = "imagenes")
    List<Perfume> findByMarca(String marca);

    // Busca perfumes por volumen (Ej: “100ml”)
    @EntityGraph(attributePaths = "imagenes")
    List<Perfume> findByVolumen(String volumen);

    // Busca perfumes por rango de precio
    @EntityGraph(attributePaths = "imagenes")
    List<Perfume> findByPrecioBetween(Double precioMin, Double precioMax);

    // Busca perfumes por nombre (búsqueda parcial, sin distinción de mayúsculas)
    @EntityGraph(attributePaths = "imagenes")
    @Query("SELECT p FROM Perfume p WHERE LOWER(p.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<Perfume> findByNombreContainingIgnoreCase(@Param("nombre") String nombre);

    // Busca perfumes que sean decant o no
    @EntityGraph(attributePaths = "imagenes")
    List<Perfume> findByDecant(boolean decant);

    // 🔍 Búsqueda avanzada (sin familia olfativa, ya que no existe en la entidad)
    @EntityGraph(attributePaths = "imagenes")
    @Query("SELECT p FROM Perfume p WHERE " +
           "(:nombre IS NULL OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))) AND " +
           "(:genero IS NULL OR p.genero = :genero) AND " +
           "(:precioMin IS NULL OR p.precio >= :precioMin) AND " +
           "(:precioMax IS NULL OR p.precio <= :precioMax) AND " +
           "(:notasPrincipales IS NULL OR p.notasPrincipales = :notasPrincipales) AND " +
           "(:marca IS NULL OR p.marca = :marca)")
    List<Perfume> buscarPerfumesAvanzado(
            @Param("nombre") String nombre,
            @Param("genero") String genero,
            @Param("notasPrincipales") String notasPrincipales,
            @Param("precioMin") Double precioMin,
            @Param("precioMax") Double precioMax,
            @Param("marca") String marca
    );
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Perfume p WHERE p.id = :id")
    Optional<Perfume> findByIdForUpdate(@Param("id") Long id);
}
