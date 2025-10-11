package org.vesper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

/**
 * DTO para la creación o actualización de un vaper.
 */
@Data
public class VapeRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;
    
    @NotNull(message = "El precio es obligatorio")
    private Double precio;
    
    private String descripcion;
    private String marca;
    private Integer stock;
    //private String imagen;

    private Integer pitadas;
    private String modos;
    private Set<Long> saboresIds; // IDs de sabores seleccionados
}
