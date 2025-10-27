package org.vesper.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.vesper.dto.ProductoResponse;
import org.vesper.service.ProductoService;

import java.util.List;

@RestController
@RequestMapping("/api/public/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoService productoService;

    @GetMapping("/buscar")
    public ResponseEntity<List<ProductoResponse>> buscarProductos(@RequestParam("q") String termino) {
        List<ProductoResponse> resultados = productoService.buscarProductos(termino);
        return ResponseEntity.ok(resultados);
    }
}