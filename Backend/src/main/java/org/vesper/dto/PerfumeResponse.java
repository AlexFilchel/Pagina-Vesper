package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * DTO de respuesta para representar perfumes en el API.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public class PerfumeResponse extends ProductoResponse {
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
