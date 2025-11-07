package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Producto;
import org.vesper.entity.ProductoDestacado;

import java.util.List;

@Repository
public interface ProductoDestacadoRepository extends JpaRepository<ProductoDestacado, Long> {

    boolean existsByProducto(Producto producto);

    List<ProductoDestacado> findAllByOrderByIdAsc();

    @Query("""
            SELECT DISTINCT pd FROM ProductoDestacado pd
            LEFT JOIN FETCH pd.producto p
            LEFT JOIN FETCH TREAT(p AS Perfume).imagenes
            LEFT JOIN FETCH TREAT(p AS Vape).imagenes
            LEFT JOIN FETCH TREAT(p AS Vape).vapeSabores vs
            LEFT JOIN FETCH vs.sabor
            ORDER BY pd.id ASC
            """)
    List<ProductoDestacado> findAllConProductoCompleto();
}
