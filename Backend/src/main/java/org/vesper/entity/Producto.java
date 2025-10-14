package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "productos",
        uniqueConstraints = @UniqueConstraint(columnNames = {"nombre", "DTYPE"}))
@Inheritance(strategy = InheritanceType.JOINED)
@MappedSuperclass
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(length = 1000)
    private String descripcion;

    private String marca;

    private Double precio;

    private Integer stock;

    /**
     * Colección de imágenes asociadas al producto. Se configura con eliminación huérfana para que
     * al borrar una imagen desde el backend también se elimine el registro asociado en la base de
     * datos. La relación es bidireccional y se administra desde la entidad {@link Imagen}.
     */
    @Builder.Default
    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Imagen> imagenes = new ArrayList<>();
}
