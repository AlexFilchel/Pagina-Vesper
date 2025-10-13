package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "domicilios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Domicilio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String calle;
    private String numero;
    private Integer piso;
    private String departamento;
    private String entreCalles;
    private String provincia;
    private String localidad;
    private String codigoPostal;
    private String observaciones;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
