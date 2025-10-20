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
    @OneToMany(mappedBy = "vape", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private Set<VapeSabor> vapeSabores = new HashSet<>();

    @Builder.Default
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinTable(
            name = "vape_imagenes",
            joinColumns = @JoinColumn(name = "vape_id"),
            inverseJoinColumns = @JoinColumn(name = "imagen_id")
    )
    private List<Imagen> imagenes = new ArrayList<>();

    public void addVapeSabor(VapeSabor vapeSabor) {
        if (vapeSabor == null) {
            return;
        }
        vapeSabor.setVape(this);
        this.vapeSabores.add(vapeSabor);
    }

    public void setVapeSabores(Set<VapeSabor> vapeSabores) {
        this.vapeSabores.clear();
        if (vapeSabores == null) {
            return;
        }
        vapeSabores.forEach(this::addVapeSabor);
    }
}
