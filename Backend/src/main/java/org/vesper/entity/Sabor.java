package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sabores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sabor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;
}
