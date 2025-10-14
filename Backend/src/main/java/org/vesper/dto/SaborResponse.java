package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de respuesta para devolver información de un sabor.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SaborResponse {

    private Long id;
    private String nombre;
}
