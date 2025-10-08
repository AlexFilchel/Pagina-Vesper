package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de respuesta para representar perfumes en el API.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PerfumeResponse {
    private Long id;
    private String nombre;
    private Double precio;
    private String descripcion;
    //private String imagen;

    private String volumen;
    private String genero;
    private String notasPrincipales;
    private String familiaOlfativa;
    private String salida;
    private String corazon;
    private String fondo;
    private String inspiracion;
    private boolean decant;
    private String fragancia;
    private Integer ml;

}
