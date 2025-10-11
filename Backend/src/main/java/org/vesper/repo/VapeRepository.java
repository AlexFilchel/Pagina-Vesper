package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Vape;

import java.util.List;
import java.util.Optional;

@Repository
public interface VapeRepository extends JpaRepository<Vape, Long>{
    
    /**
     * Verifica si existe un vaper con el nombre dado.
     */
    boolean existsByNombre(String nombre);
    
    /**
     * Busca un vaper por nombre.
     */
    Optional<Vape> findByNombre(String nombre);
    
    
    /**
     * Busca vapers por rango de pitadas.
     */
    List<Vape> findByPitadasBetween(Integer minPitadas, Integer maxPitadas);
    
    /**
     * Busca vapers que contengan un sabor específico.
     */
    @Query("SELECT v FROM Vape v JOIN v.sabores s WHERE s.nombre = :saborNombre")
    List<Vape> findBySaborNombre(@Param("saborNombre") String saborNombre);
    
    /**
     * Busca vapers por nombre (búsqueda parcial, case insensitive).
     */
    @Query("SELECT v FROM Vape v WHERE LOWER(v.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<Vape> findByNombreContainingIgnoreCase(@Param("nombre") String nombre);
    
    /**
     * Busca vapers por rango de precio.
     */
    List<Vape> findByPrecioBetween(Double precioMin, Double precioMax);
}
