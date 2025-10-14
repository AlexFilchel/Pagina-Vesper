package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "vapes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
public class Vape extends Producto {
    private Integer pitadas;
    private String modos;
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "vape_sabor",
            joinColumns = @JoinColumn(name = "vape_id"),
            inverseJoinColumns = @JoinColumn(name = "sabor_id")
    )
    @Builder.Default
    private Set<Sabor> sabores = new HashSet<>();

    @Builder.Default
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinTable(
            name = "vape_imagenes",
            joinColumns = @JoinColumn(name = "vape_id"),
            inverseJoinColumns = @JoinColumn(name = "imagen_id")
    )
    private List<Imagen> imagenes = new ArrayList<>();
}
