package org.vesper.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VentaEstadoRequest {

    @NotBlank(message = "El estado de la venta es obligatorio")
    private String estado;
}
