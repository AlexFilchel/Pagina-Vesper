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
    private ProductoInfo producto;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductoInfo {
        private Long id;
        private String tipo;
        private String nombre;
        private String descripcion;
        private String marca;
        private Double precio;
        private Double precioTransferencia;
        private Integer stock;
        private Boolean decant;
        private Double ml;
        private String volumen;
        private String genero;
        private Integer pitadas;
        private String modos;
        private List<ImagenResponse> imagenes;
    }
}
