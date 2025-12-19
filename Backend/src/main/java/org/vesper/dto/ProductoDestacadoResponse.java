package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoDestacadoResponse {

    private Long id;
    private Long productoId;
    private String tipo;
    private String nombre;
    private String marca;
    private String descripcion;
    private Double precio;
    private Double precioTransferencia;
    private Double ml;
    private String volumen;
    private String genero;
    private Integer pitadas;
    private Integer stock;
    private List<ImagenResponse> imagenes;
}
