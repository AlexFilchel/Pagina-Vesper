package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Producto;
import org.vesper.entity.ProductoDestacado;

import java.util.List;

@Repository
public interface ProductoDestacadoRepository extends JpaRepository<ProductoDestacado, Long> {

    boolean existsByProducto(Producto producto);

    List<ProductoDestacado> findAllByOrderByIdAsc();
}
