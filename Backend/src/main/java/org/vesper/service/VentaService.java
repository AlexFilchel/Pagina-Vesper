package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.vesper.dto.DetalleVentaRequest;
import org.vesper.dto.DetalleVentaResponse;
import org.vesper.dto.VentaRequest;
import org.vesper.dto.VentaResponse;
import org.vesper.entity.DetalleVenta;
import org.vesper.entity.Perfume;
import org.vesper.entity.Venta;
import org.vesper.entity.Venta.EstadoVenta;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.exception.UnauthorizedException;
import org.vesper.repo.PerfumeRepository;
import org.vesper.repo.VentaRepository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VentaService {

    private final VentaRepository ventaRepository;
    private final PerfumeRepository perfumeRepository;

    @Transactional
    public VentaResponse registrarVenta(VentaRequest request, Jwt jwt) {
        String usuarioAuth0Id = obtenerClaim(jwt, "sub");
        String usuarioEmail = obtenerClaim(jwt, "email");

        Venta venta = Venta.builder()
                .usuarioAuth0Id(usuarioAuth0Id)
                .usuarioEmail(usuarioEmail)
                .estado(EstadoVenta.COMPLETADA.toString())
                .build();

        List<DetalleVenta> detalles = new ArrayList<>();
        double total = 0.0;

        for (DetalleVentaRequest detalleRequest : request.getDetalles()) {
            // Buscar con BLOQUEO PESIMISTA
            Perfume perfume = perfumeRepository.findByIdForUpdate(detalleRequest.getProductoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Perfume no encontrado con id: " + detalleRequest.getProductoId()));

            Integer cantidadSolicitada = detalleRequest.getCantidad();

            if (perfume.getStock() == null || perfume.getStock() < cantidadSolicitada) {
                throw new AlreadyExistsException("Stock insuficiente para el perfume: " + perfume.getNombre());
            }

            // Descontar stock
            perfume.setStock(perfume.getStock() - cantidadSolicitada);
            // No es necesario llamar a save() explícitamente si estamos en una transacción,
            // pero se puede hacer por claridad o si no hay dirty checking activado (en JPA estándar sí lo hay).
            // perfumerepository.save(perfume); 

            Double precioUnitario = perfume.getPrecio();
            double subtotal = precioUnitario * cantidadSolicitada;

            DetalleVenta detalleVenta = DetalleVenta.builder()
                    .cantidad(cantidadSolicitada)
                    .precioUnitario(precioUnitario)
                    .subtotal(subtotal)
                    .perfume(perfume)
                    .venta(venta)
                    .build();

            detalles.add(detalleVenta);
            total += subtotal;
        }

        venta.setTotal(total);
        venta.setDetalles(detalles);

        Venta guardada = ventaRepository.save(venta);
        return toResponse(guardada);
    }

    /**
     * Crea una entidad Venta con estado PENDIENTE.
     * Esta es la primera etapa del proceso de compra.
     * No descuenta stock.
     */
    @Transactional
    public Venta crearVentaPendiente(VentaRequest request, Jwt jwt) {
        String usuarioAuth0Id = obtenerClaim(jwt, "sub");
        String usuarioEmail = obtenerClaim(jwt, "email");

        Venta venta = Venta.builder()
                .usuarioAuth0Id(usuarioAuth0Id)
                .usuarioEmail(usuarioEmail)
                .estado(EstadoVenta.PENDIENTE.toString())
                .build();

        List<DetalleVenta> detalles = new ArrayList<>();
        double total = 0.0;

        for (DetalleVentaRequest detalleRequest : request.getDetalles()) {
            Perfume perfume = perfumeRepository.findById(detalleRequest.getProductoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Perfume no encontrado con id: " + detalleRequest.getProductoId()));

            // Verificar si hay stock suficiente (aunque no se descuente aún)
            if (perfume.getStock() == null || perfume.getStock() < detalleRequest.getCantidad()) {
                throw new AlreadyExistsException("Stock insuficiente para el perfume: " + perfume.getNombre());
            }

            Integer cantidad = detalleRequest.getCantidad();
            Double precioUnitario = perfume.getPrecio();
            double subtotal = precioUnitario * cantidad;

            DetalleVenta detalleVenta = DetalleVenta.builder()
                    .cantidad(cantidad)
                    .precioUnitario(precioUnitario)
                    .subtotal(subtotal)
                    .perfume(perfume)
                    .venta(venta)
                    .build();

            detalles.add(detalleVenta);
            total += subtotal;
        }

        venta.setTotal(total);
        venta.setDetalles(detalles);
        return ventaRepository.save(venta);
    }

    @Transactional(readOnly = true)
    public List<VentaResponse> listarTodas() {
        return ventaRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VentaResponse obtenerPorId(Long id) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));
        return toResponse(venta);
    }

    @Transactional(readOnly = true)
    public List<VentaResponse> listarPorUsuario(Jwt jwt) {
        String usuarioAuth0Id = obtenerClaim(jwt, "sub");

        if (!StringUtils.hasText(usuarioAuth0Id)) {
            throw new UnauthorizedException("Usuario no autorizado");
        }

        return ventaRepository.findByUsuarioAuth0Id(usuarioAuth0Id)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // 🔧 Métodos auxiliares
    // =========================================================

    private VentaResponse toResponse(Venta venta) {
        List<DetalleVentaResponse> detalles = venta.getDetalles() == null
                ? Collections.emptyList()
                : venta.getDetalles().stream()
                .map(this::toDetalleResponse)
                .collect(Collectors.toList());

        return VentaResponse.builder()
                .id(venta.getId())
                .fecha(venta.getFecha())
                .total(venta.getTotal())
                .usuarioEmail(venta.getUsuarioEmail())
                .estado(venta.getEstado())
                .detalles(detalles)
                .build();
    }

    private DetalleVentaResponse toDetalleResponse(DetalleVenta detalle) {
        // Asumiendo que el nombre del producto viene del perfume
        String nombreProducto = (detalle.getPerfume() != null) ? detalle.getPerfume().getNombre() : "Desconocido";

        return DetalleVentaResponse.builder()
                .nombreProducto(nombreProducto)
                .cantidad(detalle.getCantidad())
                .precio(detalle.getPrecioUnitario())
                .subtotal(detalle.getSubtotal())
                .build();
    }

    private String obtenerClaim(Jwt jwt, String claimName) {
        if (jwt == null) {
            throw new UnauthorizedException("Usuario no autorizado");
        }
        String value = jwt.getClaim(claimName);
        if (!StringUtils.hasText(value)) {
            throw new UnauthorizedException("Usuario no autorizado");
        }
        return value;
    }
}
