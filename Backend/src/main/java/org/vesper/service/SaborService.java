package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vesper.dto.SaborRequest;
import org.vesper.dto.SaborResponse;
import org.vesper.entity.Sabor;
import org.vesper.repo.SaborRepository;

import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Servicio para gestionar sabores de vapes.
 * Encapsula la lógica de negocio.
 */
@Service
@RequiredArgsConstructor
public class SaborService {

    private final SaborRepository saborRepository;

    // =========================================================
    // 🟢 MÉTODOS PÚBLICOS
    // =========================================================

    public List<SaborResponse> listarTodos() {
        return saborRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Optional<SaborResponse> obtenerPorId(Long id) {
        return saborRepository.findById(id).map(this::toResponse);
    }

    public List<SaborResponse> buscarPorNombre(String nombre) {
        return saborRepository.findByNombreContainingIgnoreCase(nombre).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // 🔴 MÉTODOS ADMIN
    // =========================================================

    @Transactional
    public SaborResponse crear(SaborRequest request) {
        if (saborRepository.findByNombreIgnoreCase(request.getNombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un sabor con el nombre: " + request.getNombre());
        }

        Sabor nuevo = Sabor.builder()
                .nombre(request.getNombre())
                .build();

        return toResponse(saborRepository.save(nuevo));
    }

    @Transactional
    public SaborResponse actualizar(Long id, SaborRequest request) {
        Sabor sabor = saborRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sabor no encontrado con id: " + id));

        sabor.setNombre(request.getNombre());
        return toResponse(saborRepository.save(sabor));
    }

    public void eliminar(Long id) {
        if (!saborRepository.existsById(id)) {
            throw new IllegalArgumentException("Sabor no encontrado con id: " + id);
        }
        saborRepository.deleteById(id);
    }

    // =========================================================
    // 🔧 MÉTODO UTIL
    // =========================================================

    private SaborResponse toResponse(Sabor sabor) {
        return SaborResponse.builder()
                .id(sabor.getId())
                .nombre(sabor.getNombre())
                .build();
    }
}
