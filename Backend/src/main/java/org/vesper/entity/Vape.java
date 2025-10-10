package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
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
    @ManyToMany
    @JoinTable(
            name = "vaper_sabor",
            joinColumns = @JoinColumn(name = "vaper_id"),
            inverseJoinColumns = @JoinColumn(name = "sabor_id")
    )
    @Builder.Default
    private Set<Sabor> sabores = new HashSet<>();
}
