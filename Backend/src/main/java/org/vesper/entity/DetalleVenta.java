package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "detalle_ventas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    // 🔹 Relación opcional con Perfume
    @ManyToOne
    @JoinColumn(name = "perfume_id")
    private Perfume perfume;

    // 🔹 Relación opcional con Vape
    @ManyToOne
    @JoinColumn(name = "vape_id")
    private Vape vape;

    private Integer cantidad;
    private Double precioUnitario;
    private Double subtotal;

    // 🔹 Método auxiliar para obtener el producto sin importar el tipo
    public String getNombreProducto() {
        if (perfume != null) return perfume.getNombre();
        if (vape != null) return vape.getNombre();
        return "Producto desconocido";
    }

    public Long getProductoId() {
        if (perfume != null) return perfume.getId();
        if (vape != null) return vape.getId();
        return null;
    }

    public Double calcularSubtotal() {
        return cantidad != null && precioUnitario != null ? cantidad * precioUnitario : 0.0;
    }
}
