package org.vesper.repo;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Vape;

import java.util.List;
import java.util.Optional;

@Repository
public interface VapeRepository extends JpaRepository<Vape, Long>{

    @Override
    @EntityGraph(attributePaths = {"imagenes", "vapeSabores", "vapeSabores.sabor"})
    List<Vape> findAll();

    @Override
    @EntityGraph(attributePaths = {"imagenes", "vapeSabores", "vapeSabores.sabor"})
    Optional<Vape> findById(Long id);
    
    /**
     * Verifica si existe un vaper con el nombre dado.
     */
    boolean existsByNombre(String nombre);
    
    /**
     * Busca un vaper por nombre.
     */
    @EntityGraph(attributePaths = {"imagenes", "vapeSabores", "vapeSabores.sabor"})
    Optional<Vape> findByNombre(String nombre);
    
    
    /**
     * Busca vapers por rango de pitadas.
     */
    @EntityGraph(attributePaths = {"imagenes", "vapeSabores", "vapeSabores.sabor"})
    List<Vape> findByPitadasBetween(Integer minPitadas, Integer maxPitadas);
    
    /**
     * Busca vapers que contengan un sabor específico.
     */
    @EntityGraph(attributePaths = {"imagenes", "vapeSabores", "vapeSabores.sabor"})
    @Query("SELECT v FROM Vape v JOIN v.vapeSabores vs JOIN vs.sabor s WHERE s.nombre = :saborNombre")
    List<Vape> findBySaborNombre(@Param("saborNombre") String saborNombre);
    
    /**
     * Busca vapers por nombre (búsqueda parcial, case insensitive).
     */
    @EntityGraph(attributePaths = {"imagenes", "vapeSabores", "vapeSabores.sabor"})
    @Query("SELECT v FROM Vape v WHERE LOWER(v.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<Vape> findByNombreContainingIgnoreCase(@Param("nombre") String nombre);
    
    /**
     * Busca vapers por rango de precio.
     */
    @EntityGraph(attributePaths = {"imagenes", "vapeSabores", "vapeSabores.sabor"})
    List<Vape> findByPrecioBetween(Double precioMin, Double precioMax);
}
