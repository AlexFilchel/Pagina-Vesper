package org.vesper.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "registro_pago")
@Data
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
public class RegistroPago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idRegistro_Pago")
    private Long id;

    // ID de pago que devuelve Mercado Pago
    @Column(name = "mp_payment_id", unique = true)
    private String mpPaymentId;

    // Estado del pago (approved, pending, rejected)
    @Column(name = "status")
    private String status;

    // Monto del pago
    @Column(name = "amount")
    private Float amount;

    // Método de pago (visa, mastercard, account_money, etc.)
    @Column(name = "payment_method")
    private String paymentMethod;

    // Fecha de aprobación
    @Column(name = "date_approved")
    private LocalDateTime dateApproved;

    // Relación con Venta (corta el ciclo RegistroPago -> venta -> registroPago ...)
    @OneToOne
    @JoinColumn(name = "idVenta", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private Venta venta;
}
