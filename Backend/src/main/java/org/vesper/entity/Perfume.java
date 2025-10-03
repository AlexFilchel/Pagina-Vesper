package org.vesper.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

@SuppressWarnings("All")
@Entity
@Table(name = "perfumes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Perfume extends Producto {
    private String volumen;
    private String genero;
    private String notasPrincipales;
    private String familiaOlfativa;
    private String salida;
    private String corazon;
    private String fondo;
    private String inspiracion;
    private boolean decant;
    private String fragancia;
    private Integer ml;
}
