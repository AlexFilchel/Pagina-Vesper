package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.Set;

/**
 * DTO de respuesta para representar vapers en el API.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public class VapeResponse extends ProductoResponse {
    private Integer pitadas;
    private String modos;
    private Set<VapeSaborResponse> sabores;
}
