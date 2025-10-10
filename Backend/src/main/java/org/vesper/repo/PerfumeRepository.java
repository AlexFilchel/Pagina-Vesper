package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Perfume;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerfumeRepository extends JpaRepository<Perfume, Long> {

    // Verifica si existe un perfume con el nombre dado
    boolean existsByNombre(String nombre);

    // Busca un perfume por nombre exacto
    Optional<Perfume> findByNombre(String nombre);

    // Busca perfumes por género
    List<Perfume> findByGenero(String genero);

    // Busca perfumes por marca
    List<Perfume> findByMarca(String marca);

    // Busca perfumes por volumen (Ej: “100ml”)
    List<Perfume> findByVolumen(String volumen);

    // Busca perfumes por rango de precio
    List<Perfume> findByPrecioBetween(Double precioMin, Double precioMax);

    // Busca perfumes por nombre (búsqueda parcial, sin distinción de mayúsculas)
    @Query("SELECT p FROM Perfume p WHERE LOWER(p.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<Perfume> findByNombreContainingIgnoreCase(@Param("nombre") String nombre);

    // Busca perfumes que sean decant o no
    List<Perfume> findByDecant(boolean decant);

    // 🔍 Búsqueda avanzada (sin familia olfativa, ya que no existe en la entidad)
    @Query("SELECT p FROM Perfume p WHERE " +
           "(:nombre IS NULL OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))) AND " +
           "(:genero IS NULL OR p.genero = :genero) AND " +
           "(:precioMin IS NULL OR p.precio >= :precioMin) AND " +
           "(:precioMax IS NULL OR p.precio <= :precioMax) AND " +
           "(:marca IS NULL OR p.marca = :marca)")
    List<Perfume> buscarPerfumesAvanzado(
            @Param("nombre") String nombre,
            @Param("genero") String genero,
            @Param("notasPrincipales") String notasPrincipales,
            @Param("precioMin") Double precioMin,
            @Param("precioMax") Double precioMax,
            @Param("marca") String marca
    );
}
