package org.vesper.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "vape_sabor")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VapeSabor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vape_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Vape vape;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sabor_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Sabor sabor;

    @Column(nullable = false)
    private Integer stock;
}
