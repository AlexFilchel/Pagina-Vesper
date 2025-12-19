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
            JOIN FETCH pd.producto p
            WHERE TYPE(p) = Vape
            ORDER BY pd.id ASC
            """)
    List<ProductoDestacado> findAllConVape();

    @Query("""
            SELECT DISTINCT pd FROM ProductoDestacado pd
            JOIN FETCH pd.producto p
            WHERE TYPE(p) = Perfume
            ORDER BY pd.id ASC
            """)
    List<ProductoDestacado> findAllConPerfume();
}
