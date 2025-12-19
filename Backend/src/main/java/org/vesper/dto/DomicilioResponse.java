package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DomicilioResponse {
    private Long id;
    private String calle;
    private String numero;
    private String piso;
    private String departamento;
    private String torre;
    private String entreCalles;
    private String provincia;
    private String localidad;
    private String codigoPostal;
    private String observaciones;
}
