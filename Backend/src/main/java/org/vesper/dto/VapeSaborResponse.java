package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VapeSaborResponse {
    private Long id;
    private Long saborId;
    private String nombre;
    private Integer stock;
}
