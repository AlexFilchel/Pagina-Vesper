package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * DTO de respuesta para representar vapers en el API.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class VaperResponse {
    private Long id;
    private String nombre;
    private Double precio;
    private String descripcion;
    private String imagen;

    private Integer pitadas;
    private String modos;

    // Nombres o descripciones de los sabores asociados
    private Set<String> sabores;
}
