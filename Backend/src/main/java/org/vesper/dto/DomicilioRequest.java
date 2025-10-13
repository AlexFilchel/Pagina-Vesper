package org.vesper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DomicilioRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 255)
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 255)
    private String apellido;

    @NotBlank(message = "El teléfono es obligatorio")
    @Pattern(regexp = "\\d{7,15}", message = "El teléfono debe contener solo números")
    private String telefono;

    @NotBlank(message = "El DNI es obligatorio")
    @Pattern(regexp = "\\d{7,8}", message = "El DNI debe tener 7 u 8 dígitos")
    private String dni;

    @NotBlank(message = "La calle es obligatoria")
    @Size(max = 255)
    private String calle;

    @NotBlank(message = "El número es obligatorio")
    @Size(max = 50)
    private String numero;

    @Size(max = 50)
    private String piso;

    @Size(max = 50)
    private String departamento;

    @Size(max = 50)
    private String torre;

    @NotBlank(message = "Las entrecalles son obligatorias")
    @Size(max = 255)
    private String entreCalles;

    @NotBlank(message = "La provincia es obligatoria")
    @Size(max = 255)
    private String provincia;

    @NotBlank(message = "La localidad es obligatoria")
    @Size(max = 255)
    private String localidad;

    @NotBlank(message = "El código postal es obligatorio")
    @Pattern(regexp = "\\d{4,5}", message = "El código postal debe tener 4 o 5 dígitos")
    private String codigoPostal;

    @Size(max = 500)
    private String observaciones;
}
