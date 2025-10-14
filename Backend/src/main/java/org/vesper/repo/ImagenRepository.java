package org.vesper.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.vesper.entity.Imagen;

import java.util.List;

/**
 * Repositorio que administra las operaciones de persistencia de {@link Imagen}.
 */
@Repository
public interface ImagenRepository extends JpaRepository<Imagen, Long> {

    /**
     * Obtiene todas las imágenes asociadas a un producto.
     *
     * @param productoId identificador del producto del que se desean obtener las imágenes.
     * @return lista de imágenes pertenecientes al producto proporcionado.
     */
    List<Imagen> findByProductoId(Long productoId);
}
