package org.vesper.service;

import lombok.RequiredArgsConstructor;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vesper.dto.ProductoResponse;
import org.vesper.repo.ProductoRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final PerfumeService perfumeService;
    private final VapeService vapeService;

    @Transactional(readOnly = true)
    public List<ProductoResponse> buscarProductos(String termino) {
        List<ProductoResponse> resultado = new ArrayList<>();

        productoRepository.buscarVapesPorTermino(termino)
                .forEach(vape -> resultado.add(vapeService.toResponse(vape)));

        productoRepository.buscarPerfumesPorTermino(termino)
                .forEach(perfume -> resultado.add(perfumeService.toResponse(perfume)));

        return resultado;
    }

    @Transactional(readOnly = true)
    public ProductoResponse obtenerProductoPorId(Long id) {
        
        // Intenta buscarlo como Vape
        var vape = productoRepository.findVapeByIdWithImagenes(id);
        if (vape.isPresent()) {
            return vapeService.toResponse(vape.get());
        }

        // Si no es Vape, intenta buscarlo como Perfume
        var perfume = productoRepository.findPerfumeByIdWithImagenes(id);
        if (perfume.isPresent()) {
            return perfumeService.toResponse(perfume.get());
        }

        // Si no es ninguno, lanza error 404
        throw new EntityNotFoundException("No se encontró un producto con el ID: " + id);
    }
}
