package org.vesper.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductoDestacadoRequest {

    @NotNull(message = "El id del producto es obligatorio")
    private Long productoId;
}
