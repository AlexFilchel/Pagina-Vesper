package org.vesper.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.ImagenResponse;
import org.vesper.dto.ProductoDestacadoRequest;
import org.vesper.dto.ProductoDestacadoResponse;
import org.vesper.entity.Imagen;
import org.vesper.entity.Perfume;
import org.vesper.entity.Producto;
import org.vesper.entity.ProductoDestacado;
import org.vesper.entity.Vape;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.BusinessRuleException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.repo.ProductoDestacadoRepository;
import org.vesper.repo.ProductoRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductoDestacadoService {

    private static final int MAX_DESTACADOS = 8;

    private final ProductoDestacadoRepository productoDestacadoRepository;
    private final ProductoRepository productoRepository;

    @Transactional
    public ProductoDestacadoResponse agregarDestacado(ProductoDestacadoRequest request) {
        Objects.requireNonNull(request, "La solicitud no puede ser nula");

        if (productoDestacadoRepository.count() >= MAX_DESTACADOS) {
            throw new BusinessRuleException("Solo se pueden destacar hasta " + MAX_DESTACADOS + " productos");
        }

        Long productoId = request.getProductoId();
        if (productoDestacadoRepository.existsByProducto_Id(productoId)) {
            throw new AlreadyExistsException("El producto ya se encuentra en destacados");
        }

        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + productoId));

        ProductoDestacado destacado = ProductoDestacado.builder()
                .producto(producto)
                .build();

        ProductoDestacado guardado = productoDestacadoRepository.save(destacado);
        return toResponse(guardado);
    }

    @Transactional
    public void eliminarDestacado(Long destacadoId) {
        ProductoDestacado destacado = productoDestacadoRepository.findById(destacadoId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto destacado no encontrado con id: " + destacadoId));
        productoDestacadoRepository.delete(destacado);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public List<ProductoDestacadoResponse> listarDestacados() {
        return productoDestacadoRepository.findAllByOrderByIdAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ProductoDestacadoResponse toResponse(ProductoDestacado destacado) {
        Producto producto = destacado.getProducto();
        ProductoDestacadoResponse.ProductoInfo productoInfo = mapProducto(producto);
        return ProductoDestacadoResponse.builder()
                .id(destacado.getId())
                .producto(productoInfo)
                .build();
    }

    private ProductoDestacadoResponse.ProductoInfo mapProducto(Producto producto) {
        if (producto == null) {
            throw new ResourceNotFoundException("Producto no disponible");
        }

        String tipo = "PRODUCTO";
        Boolean esDecant = null;
        Double ml = null;
        String volumen = null;
        String genero = null;
        Integer pitadas = null;
        String modos = null;
        List<ImagenResponse> imagenes = Collections.emptyList();

        if (producto instanceof Perfume perfume) {
            esDecant = perfume.getDecant();
            tipo = Boolean.TRUE.equals(esDecant) ? "DECANT" : "PERFUME";
            ml = perfume.getMl();
            volumen = perfume.getVolumen();
            genero = perfume.getGenero();
            imagenes = mapImagenes(perfume.getImagenes());
        } else if (producto instanceof Vape vape) {
            tipo = "VAPE";
            pitadas = vape.getPitadas();
            modos = vape.getModos();
            imagenes = mapImagenes(vape.getImagenes());
        }

        Double precio = producto.getPrecio();
        Double precioTransferencia = calcularPrecioTransferencia(precio);

        return ProductoDestacadoResponse.ProductoInfo.builder()
                .id(producto.getId())
                .tipo(tipo)
                .nombre(producto.getNombre())
                .descripcion(producto.getDescripcion())
                .marca(producto.getMarca())
                .precio(precio)
                .precioTransferencia(precioTransferencia)
                .stock(producto.getStock())
                .decant(esDecant)
                .ml(ml)
                .volumen(volumen)
                .genero(genero)
                .pitadas(pitadas)
                .modos(modos)
                .imagenes(imagenes)
                .build();
    }

    private Double calcularPrecioTransferencia(Double precio) {
        if (precio == null) {
            return null;
        }
        BigDecimal original = BigDecimal.valueOf(precio);
        BigDecimal descuento = original.multiply(BigDecimal.valueOf(0.85));
        return descuento.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private List<ImagenResponse> mapImagenes(List<Imagen> imagenes) {
        if (imagenes == null || imagenes.isEmpty()) {
            return Collections.emptyList();
        }
        return imagenes.stream()
                .map(imagen -> new ImagenResponse(imagen.getId(), imagen.getUrl()))
                .collect(Collectors.toList());
    }
}
