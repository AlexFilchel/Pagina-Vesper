package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String auth0Id; // 🔑 vínculo con Auth0

    private String nombre;
    private String apellido;

    @Column(unique = true, nullable = false)
    private String email;

    private Integer telefono;
    private Integer dni;

    // 🔹 Relación muchos-a-muchos con tabla intermedia
    @ManyToMany
    @JoinTable(
            name = "usuario_domicilio",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "domicilio_id")
    )
    @Builder.Default
    private Set<Domicilio> domicilios = new HashSet<>();
}

