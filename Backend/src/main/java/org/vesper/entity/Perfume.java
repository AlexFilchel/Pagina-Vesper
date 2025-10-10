package org.vesper.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Entidad que representa un perfume.
 * Extiende de Producto y agrega campos específicos de perfumería.
 */
@Entity
@Table(name = "perfumes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
public class Perfume extends Producto {

    @Column(length = 50)
    private String volumen; // Ej: "100ml", "50ml", etc.

    @Column(length = 30)
    private String genero; // Ej: "Masculino", "Femenino", "Unisex"

    @Column(length = 255)
    private String notasPrincipales; // Notas destacadas

    @Column(length = 255)
    private String salida; // Notas de salida

    @Column(length = 255)
    private String corazon; // Notas de corazón

    @Column(length = 255)
    private String fondo; // Notas de fondo

    @Column(length = 255)
    private String inspiracion; // Ej: "Inspirado en Dior Sauvage"

    private Boolean decant; // true si es decant (frasco fraccionado)

    @Column(length = 100)
    private String fragancia; // Nombre comercial de la fragancia

    private Double ml; // Mililitros exactos (ej: 100.0, 50.0)
}
