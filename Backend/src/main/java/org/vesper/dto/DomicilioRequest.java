package org.vesper.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DomicilioRequest {

    @NotBlank(message = "La calle es obligatoria")
    private String calle;

    @NotBlank(message = "La localidad es obligatoria")
    private String localidad;

    private String provincia;
    private String codigoPostal;
}