package org.vesper.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import org.vesper.entity.MetodoPago;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VentaRequest {

    @NotEmpty(message = "La venta debe contener al menos un detalle")
    @Valid
    private List<DetalleVentaRequest> detalles;

    @NotNull(message = "El método de pago no puede estar vacío")
    private MetodoPago metodo;

}
