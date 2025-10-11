package org.vesper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * DTO para la creación o actualización de un perfume.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public class PerfumeRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;
    
    @NotNull(message = "El precio es obligatorio")
    private Double precio;
    
    private String descripcion;
    private String marca;
    private Integer stock;
    //private String imagen;

    private String volumen;
    private String genero;
    private String notasPrincipales;
    private String salida;
    private String corazon;
    private String fondo;
    private String inspiracion;
    private Boolean decant;
    private String fragancia;
    private Double ml;
}
