package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.DomicilioRequest;
import org.vesper.dto.DomicilioResponse;
import org.vesper.service.DomicilioService;

import java.util.List;

@RestController
@RequestMapping("/usuarios/{usuarioId}/domicilios")
@RequiredArgsConstructor
public class DomicilioController {

    private final DomicilioService domicilioService;

    @GetMapping
    public ResponseEntity<List<DomicilioResponse>> listar(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(domicilioService.listarPorUsuario(usuarioId));
    }

    @PostMapping
    public ResponseEntity<DomicilioResponse> crear(@PathVariable Long usuarioId,
                                                   @Valid @RequestBody DomicilioRequest request) {
        DomicilioResponse response = domicilioService.agregarDomicilio(usuarioId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{domicilioId}")
    public ResponseEntity<DomicilioResponse> actualizar(@PathVariable Long usuarioId,
                                                        @PathVariable Long domicilioId,
                                                        @Valid @RequestBody DomicilioRequest request) {
        return ResponseEntity.ok(domicilioService.actualizarDomicilio(usuarioId, domicilioId, request));
    }

    @DeleteMapping("/{domicilioId}")
    public ResponseEntity<Void> eliminar(@PathVariable Long usuarioId, @PathVariable Long domicilioId) {
        domicilioService.eliminarDomicilio(usuarioId, domicilioId);
        return ResponseEntity.noContent().build();
    }
}
