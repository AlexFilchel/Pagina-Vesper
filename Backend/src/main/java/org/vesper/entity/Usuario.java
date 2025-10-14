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
    private String auth0Id;

    private String nombre;
    private String apellido;

    @Column(unique = true, nullable = false)
    private String email;

    private Integer telefono;
    private Integer dni;

    
    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Domicilio> domicilios = new HashSet<>();

    public void agregarDomicilio(Domicilio domicilio) {
        domicilios.add(domicilio);
        domicilio.setUsuario(this);
    }

    public void eliminarDomicilio(Domicilio domicilio) {
        domicilios.remove(domicilio);
        domicilio.setUsuario(null);
    }
}
