package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que representa la información expuesta al frontend para cada imagen almacenada en Cloudinary.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ImagenResponse {

    /**
     * Identificador de la imagen en la base de datos local.
     */
    private Long id;

    /**
     * URL pública desde donde se puede visualizar la imagen.
     */
    private String url;
}
