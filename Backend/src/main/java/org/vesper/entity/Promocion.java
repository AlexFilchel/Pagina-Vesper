package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "promociones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promocion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

     // 🔹 Relación opcional con Perfume
    @ManyToOne
    @JoinColumn(name = "perfume_id")
    private Perfume perfume;

    // 🔹 Relación opcional con Vape
    @ManyToOne
    @JoinColumn(name = "vape_id")
    private Vape vape;


    private String descripcion;

    private Double descuento; // Ej: 0.20 para 20%

    private LocalDate fechaInicio;

    private LocalDate fechaFin;

    @Builder.Default
    private boolean activo = true;
}
