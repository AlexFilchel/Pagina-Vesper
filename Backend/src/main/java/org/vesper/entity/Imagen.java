package org.vesper.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.BatchSize;

/**
 * Entidad JPA que representa una imagen almacenada en Cloudinary y asociada a un {@link Producto}.
 * Cada imagen conserva la URL pública y el identificador necesario para realizar operaciones en
 * el proveedor externo.
 */
@Entity
@Table(name = "imagenes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@BatchSize(size = 50)
public class Imagen {

    /**
     * Identificador único de la imagen en la base de datos local.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * URL pública de la imagen almacenada en Cloudinary.
     */
    private String url;

    /**
     * Identificador interno de Cloudinary utilizado para eliminar o actualizar la imagen.
     */
    private String publicId;
}
