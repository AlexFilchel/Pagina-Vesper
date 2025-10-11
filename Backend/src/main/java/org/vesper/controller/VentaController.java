package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;
import org.vesper.dto.VentaRequest;
import org.vesper.dto.VentaResponse;
import org.vesper.exception.UnauthorizedException;
import org.vesper.service.VentaService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;

    @PostMapping("/ventas")
    public ResponseEntity<VentaResponse> registrarVenta(@Valid @RequestBody VentaRequest request,
                                                        @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ventaService.registrarVenta(request, jwt));
    }

    @GetMapping("/ventas")
    public ResponseEntity<List<VentaResponse>> listarVentas() {
        return ResponseEntity.ok(ventaService.listarTodas());
    }

    @GetMapping("/ventas/{id}")
    public ResponseEntity<VentaResponse> obtenerVenta(@PathVariable Long id) {
        return ResponseEntity.ok(ventaService.obtenerPorId(id));
    }

    @GetMapping("/ventas/usuario")
    public ResponseEntity<List<VentaResponse>> listarVentasUsuario(@AuthenticationPrincipal Jwt jwt) {
        String usuarioAuth0Id = obtenerUsuarioDesdeJwt(jwt);
        return ResponseEntity.ok(ventaService.listarPorUsuario(usuarioAuth0Id));
    }

    private String obtenerUsuarioDesdeJwt(Jwt jwt) {
        if (jwt == null) {
            throw new UnauthorizedException("Usuario no autorizado");
        }
        String sub = jwt.getClaim("sub");
        if (!StringUtils.hasText(sub)) {
            throw new UnauthorizedException("Usuario no autorizado");
        }
        return sub;
    }
}
