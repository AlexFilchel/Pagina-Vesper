package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vesper.dto.ImagenResponse;
import org.vesper.dto.ProductoDestacadoResponse;
import org.vesper.entity.Imagen;
import org.vesper.entity.Perfume;
import org.vesper.entity.Producto;
import org.vesper.entity.ProductoDestacado;
import org.vesper.entity.Vape;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.ProductoDestacadoRepository;
import org.vesper.repo.ProductoRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductoDestacadoService {

    private static final int MAX_DESTACADOS = 8;

    private final ProductoDestacadoRepository productoDestacadoRepository;
    private final ProductoRepository productoRepository;

    @Transactional(readOnly = true)
    public List<ProductoDestacadoResponse> listarDestacados() {
        return obtenerDestacadosConProducto()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductoDestacadoResponse agregarDestacado(Long productoId) {
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + productoId));

        if (productoDestacadoRepository.existsByProducto(producto)) {
            throw new AlreadyExistsException("El producto ya se encuentra destacado.");
        }

        if (productoDestacadoRepository.count() >= MAX_DESTACADOS) {
            throw new AlreadyExistsException("Solo se permiten " + MAX_DESTACADOS + " productos destacados.");
        }

        ProductoDestacado destacado = ProductoDestacado.builder()
                .producto(producto)
                .build();

        ProductoDestacado guardado = productoDestacadoRepository.save(destacado);
        return toResponse(guardado);
    }

    @Transactional
    public void eliminarDestacado(Long destacadoId) {
        if (!productoDestacadoRepository.existsById(destacadoId)) {
            throw new ResourceNotFoundException("Producto destacado no encontrado con id: " + destacadoId);
        }
        productoDestacadoRepository.deleteById(destacadoId);
    }

    private List<ProductoDestacado> obtenerDestacadosConProducto() {
        List<ProductoDestacado> destacados = new ArrayList<>();
        destacados.addAll(productoDestacadoRepository.findAllConVape());
        destacados.addAll(productoDestacadoRepository.findAllConPerfume());
        destacados.sort(Comparator.comparing(ProductoDestacado::getId));
        return destacados;
    }

    private ProductoDestacadoResponse toResponse(ProductoDestacado destacado) {
        Producto producto = destacado.getProducto();
        List<ImagenResponse> imagenes = extraerImagenes(producto);

        Double precio = producto.getPrecio();
        Double precioTransferencia = precio != null
                ? BigDecimal.valueOf(precio).multiply(BigDecimal.valueOf(0.85))
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue()
                : null;

        ProductoDestacadoResponse.ProductoDestacadoResponseBuilder builder = ProductoDestacadoResponse.builder()
                .id(destacado.getId())
                .productoId(producto.getId())
                .tipo(obtenerTipo(producto))
                .nombre(producto.getNombre())
                .marca(producto.getMarca())
                .descripcion(producto.getDescripcion())
                .precio(precio)
                .precioTransferencia(precioTransferencia)
                .stock(producto.getStock())
                .imagenes(imagenes);

        if (producto instanceof Perfume perfume) {
            builder
                    .ml(perfume.getMl())
                    .volumen(perfume.getVolumen())
                    .genero(perfume.getGenero());
        } else if (producto instanceof Vape vape) {
            builder
                    .pitadas(vape.getPitadas());
        }

        return builder.build();
    }

    private List<ImagenResponse> extraerImagenes(Producto producto) {
        if (producto instanceof Perfume perfume) {
            return mapImagenes(perfume.getImagenes());
        }
        if (producto instanceof Vape vape) {
            return mapImagenes(vape.getImagenes());
        }
        return Collections.emptyList();
    }

    private List<ImagenResponse> mapImagenes(List<Imagen> imagenes) {
        if (imagenes == null) {
            return Collections.emptyList();
        }
        return imagenes.stream()
                .map(imagen -> new ImagenResponse(imagen.getId(), imagen.getUrl()))
                .collect(Collectors.toList());
    }

    private String obtenerTipo(Producto producto) {
        if (producto instanceof Perfume) {
            return "PERFUME";
        }
        if (producto instanceof Vape) {
            return "VAPE";
        }
        return "PRODUCTO";
    }
}
