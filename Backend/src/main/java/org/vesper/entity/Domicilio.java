package org.vesper.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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

    @NotBlank
    @Size(max = 255)
    private String nombre;

    @NotBlank
    @Size(max = 255)
    private String apellido;

    @NotBlank
    @Pattern(regexp = "\\d{7,15}")
    private String telefono;

    @NotBlank
    @Pattern(regexp = "\\d{7,8}")
    private String dni;

    @NotBlank
    @Size(max = 255)
    private String calle;

    @NotBlank
    @Size(max = 50)
    private String numero;

    @Size(max = 50)
    private String piso;

    @Size(max = 50)
    private String departamento;

    @Size(max = 50)
    private String torre;

    @NotBlank
    @Size(max = 255)
    private String entreCalles;

    @NotBlank
    @Size(max = 255)
    private String provincia;

    @NotBlank
    @Size(max = 255)
    private String localidad;

    @NotBlank
    @Pattern(regexp = "\\d{4,5}")
    private String codigoPostal;

    @Size(max = 500)
    private String observaciones;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
