package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleVentaResponse {

    private String nombreProducto;
    private Integer cantidad;
    private Double precio;
    private Double subtotal;
}
