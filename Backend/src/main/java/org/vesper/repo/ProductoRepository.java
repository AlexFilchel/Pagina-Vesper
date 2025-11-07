package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Producto;

import java.util.List;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

    @Query("""
            SELECT DISTINCT p FROM Producto p
            LEFT JOIN FETCH TREAT(p AS Perfume).imagenes
            LEFT JOIN FETCH TREAT(p AS Vape).imagenes
            LEFT JOIN FETCH TREAT(p AS Vape).vapeSabores vs
            LEFT JOIN FETCH vs.sabor
            WHERE LOWER(p.nombre) LIKE LOWER(CONCAT('%', :termino, '%'))
               OR LOWER(p.marca) LIKE LOWER(CONCAT('%', :termino, '%'))
               OR LOWER(p.descripcion) LIKE LOWER(CONCAT('%', :termino, '%'))
            """)
    List<Producto> buscarPorTerminoGeneralConDetalles(@Param("termino") String termino);
}