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
    private String ciudad;
    private String provincia;
    private String codigoPostal;
}
