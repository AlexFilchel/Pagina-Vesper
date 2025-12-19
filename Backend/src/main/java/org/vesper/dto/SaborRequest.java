package org.vesper.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO para crear o actualizar un sabor.
 */
@Data
public class SaborRequest {

    @NotBlank(message = "El nombre del sabor es obligatorio")
    private String nombre;
}
