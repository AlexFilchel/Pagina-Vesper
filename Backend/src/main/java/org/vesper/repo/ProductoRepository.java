package org.vesper.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Perfume;
import org.vesper.entity.Producto;
import org.vesper.entity.Vape;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

    @Query("""
            SELECT v FROM Vape v
            LEFT JOIN FETCH v.imagenes
            WHERE LOWER(v.nombre) LIKE LOWER(CONCAT('%', :termino, '%'))
               OR LOWER(v.marca) LIKE LOWER(CONCAT('%', :termino, '%'))
               OR LOWER(v.descripcion) LIKE LOWER(CONCAT('%', :termino, '%'))
            """)
    List<Vape> buscarVapesPorTermino(@Param("termino") String termino);

    @Query("""
            SELECT p FROM Perfume p
            LEFT JOIN FETCH p.imagenes
            WHERE LOWER(p.nombre) LIKE LOWER(CONCAT('%', :termino, '%'))
               OR LOWER(p.marca) LIKE LOWER(CONCAT('%', :termino, '%'))
               OR LOWER(p.descripcion) LIKE LOWER(CONCAT('%', :termino, '%'))
            """)
    List<Perfume> buscarPerfumesPorTermino(@Param("termino") String termino);
}
