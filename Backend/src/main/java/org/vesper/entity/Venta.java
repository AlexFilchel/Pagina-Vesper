package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ventas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_auth0_id", nullable = false)
    private String usuarioAuth0Id;

    @Column(name = "usuario_email", nullable = false)
    private String usuarioEmail;

    @Builder.Default
    private LocalDateTime fecha = LocalDateTime.now();

    private Double total; // total de la venta (histórico, congelado)

    // Relación con los detalles de la venta
    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DetalleVenta> detalles = new ArrayList<>();
}
