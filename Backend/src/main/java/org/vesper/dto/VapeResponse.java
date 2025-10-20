package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

/**
 * DTO de respuesta para representar vapers en el API.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VapeResponse {
    private Long id;
    private String nombre;
    private Double precio;
    private String descripcion;

    private Integer pitadas;
    private String modos;

    private Integer stock;

    private Set<VapeSaborResponse> sabores;
    private List<ImagenResponse> imagenes;
}
