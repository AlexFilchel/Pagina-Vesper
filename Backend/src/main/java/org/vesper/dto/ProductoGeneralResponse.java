package org.vesper.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductoGeneralResponse {

    private Long id;
    private String nombre;
    private String descripcion;
    private String marca;
    private Double precio;
    private Integer stock;
    private String tipoProducto; // "Perfume" o "Vape"
    private List<String> imagenesUrl;

}
