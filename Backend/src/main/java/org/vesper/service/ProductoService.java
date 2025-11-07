package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vesper.dto.ProductoResponse;
import org.vesper.entity.Perfume;
import org.vesper.entity.Producto;
import org.vesper.entity.Vape;
import org.vesper.repo.ProductoRepository;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final PerfumeService perfumeService;
    private final VapeService vapeService;

    @Transactional(readOnly = true)
    public List<ProductoResponse> buscarProductos(String termino) {
        List<Producto> productos = productoRepository.buscarPorTerminoGeneralConDetalles(termino);
        return productos.stream()
                .map(this::toProductoResponse)
                .collect(Collectors.toList());
    }

    /**
     * Convierte una entidad Producto a su DTO de respuesta específico (PerfumeResponse o VapeResponse).
     * Este es el núcleo de la respuesta polimórfica.
     */
    private ProductoResponse toProductoResponse(Producto producto) {
        if (producto instanceof Perfume perfume) {
            // Reutilizamos el mapper de PerfumeService
            return perfumeService.toResponse(perfume);
        } else if (producto instanceof Vape vape) {
            // Reutilizamos el mapper de VapeService
            return vapeService.toResponse(vape);
        }
        // Fallback para productos genéricos (si existieran en el futuro)
        throw new IllegalStateException("Tipo de producto desconocido: " + producto.getClass().getName());
    }
}