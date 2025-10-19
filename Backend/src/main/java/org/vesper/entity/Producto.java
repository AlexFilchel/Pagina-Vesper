package org.vesper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.TableGenerator;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@MappedSuperclass
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Producto {

    @TableGenerator(
            name = "producto_id_generator",
            table = "producto_id_sequence",
            pkColumnName = "sequence_name",
            valueColumnName = "next_val",
            pkColumnValue = "producto",
            allocationSize = 1
    )
    @Id
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "producto_id_generator")
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(length = 1000)
    private String descripcion;

    private String marca;

    private Double precio;

    private Integer stock;

}
