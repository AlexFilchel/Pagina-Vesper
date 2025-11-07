package org.vesper.service;

import lombok.RequiredArgsConstructor;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vesper.dto.ProductoResponse;
import org.vesper.repo.ProductoRepository;

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
}
