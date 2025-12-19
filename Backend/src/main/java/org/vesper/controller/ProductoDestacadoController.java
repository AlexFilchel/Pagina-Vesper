package org.vesper.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vesper.dto.ProductoDestacadoRequest;
import org.vesper.dto.ProductoDestacadoResponse;
import org.vesper.service.ProductoDestacadoService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProductoDestacadoController {

    private final ProductoDestacadoService productoDestacadoService;

    @GetMapping({"/public/productos-destacados", "/admin/productos-destacados"})
    public ResponseEntity<List<ProductoDestacadoResponse>> listarDestacados() {
        return ResponseEntity.ok(productoDestacadoService.listarDestacados());
    }

    @PostMapping("/admin/productos-destacados")
    public ResponseEntity<ProductoDestacadoResponse> agregarDestacado(
            @Valid @RequestBody ProductoDestacadoRequest request) {
        return ResponseEntity.ok(productoDestacadoService.agregarDestacado(request.getProductoId()));
    }

    @DeleteMapping("/admin/productos-destacados/{id}")
    public ResponseEntity<Map<String, String>> eliminarDestacado(@PathVariable Long id) {
        productoDestacadoService.eliminarDestacado(id);
        return ResponseEntity.ok(Map.of("message", "Producto destacado eliminado correctamente"));
    }
}
