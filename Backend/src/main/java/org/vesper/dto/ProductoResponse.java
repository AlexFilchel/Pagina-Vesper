package org.vesper.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

/**
 * DTO base para respuestas de productos.
 * Utiliza anotaciones de Jackson para manejar la serialización polimórfica, permitiendo que el JSON de respuesta
 * tenga la estructura correcta para cada tipo de producto (PerfumeResponse, VapeResponse, etc.).
 */
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.PROPERTY,
        property = "tipoProducto" // Este campo se añadirá al JSON para identificar el tipo
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = PerfumeResponse.class, name = "Perfume"),
        @JsonSubTypes.Type(value = VapeResponse.class, name = "Vape")
})
public abstract class ProductoResponse {
    private Long id;
    private String nombre;
    private String descripcion;
    private String marca;
    private Double precio;
    private Integer stock;
    private List<ImagenResponse> imagenes;
}