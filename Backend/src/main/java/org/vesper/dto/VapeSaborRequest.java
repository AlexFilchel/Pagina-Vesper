package org.vesper.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VapeSaborRequest {

    @NotBlank(message = "El nombre del sabor es obligatorio")
    private String nombre;

    @NotNull(message = "El stock del sabor es obligatorio")
    @Min(value = 0, message = "El stock del sabor no puede ser negativo")
    private Integer stock;
}
