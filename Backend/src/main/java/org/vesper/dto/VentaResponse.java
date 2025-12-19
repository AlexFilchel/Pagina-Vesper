package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VentaResponse {

    private Long id;
    private LocalDateTime fecha;
    private Double total;
    private String usuarioEmail;
    private String estado;
    private List<DetalleVentaResponse> detalles;
}
