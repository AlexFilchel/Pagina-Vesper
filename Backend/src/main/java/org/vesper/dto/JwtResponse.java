package org.vesper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JwtResponse {

    @NotBlank(message = "El token no puede ser nulo o vacío")
    private String token;

    @NotBlank(message = "El nombre de usuario es obligatorio")
    private String username;

    @NotEmpty(message = "Debe existir al menos un rol")
    private List<String> roles;
}
