package org.vesper.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "vapers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vaper extends Producto {
    private Integer pitadas;
    private String modos;
    public enum sabores{

    }
}
