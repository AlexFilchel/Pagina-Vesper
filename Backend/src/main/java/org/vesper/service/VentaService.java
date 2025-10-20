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
import org.vesper.entity.Producto;
import org.vesper.entity.Vape;
import org.vesper.entity.VapeSabor;
import org.vesper.entity.Venta;
import org.vesper.exception.AlreadyExistsException;
import org.vesper.exception.ResourceNotFoundException;
import org.vesper.exception.UnauthorizedException;
import org.vesper.repo.PerfumeRepository;
import org.vesper.repo.VapeRepository;
import org.vesper.repo.VentaRepository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VentaService {

    private final VentaRepository ventaRepository;
    private final PerfumeRepository perfumeRepository;
    private final VapeRepository vapeRepository;

    @Transactional
    public VentaResponse registrarVenta(VentaRequest request, Jwt jwt) {
        String usuarioAuth0Id = obtenerClaim(jwt, "sub");
        String usuarioEmail = obtenerClaim(jwt, "email");

        Venta venta = Venta.builder()
                .usuarioAuth0Id(usuarioAuth0Id)
                .usuarioEmail(usuarioEmail)
                .build();

        List<DetalleVenta> detalles = new ArrayList<>();
        double total = 0.0;

        for (DetalleVentaRequest detalleRequest : request.getDetalles()) {
            // Buscar el producto en ambos repositorios
            Producto producto = perfumeRepository.findById(detalleRequest.getProductoId())
                    .<Producto>map(p -> p) // Cast Optional<Perfume> to Optional<Producto>
                    .orElseGet(() -> vapeRepository.findById(detalleRequest.getProductoId())
                            .<Producto>map(v -> v) // Cast Optional<Vape> to Optional<Producto>
                            .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + detalleRequest.getProductoId())));

            Integer cantidadSolicitada = detalleRequest.getCantidad();
            if (producto instanceof Vape) {
                Vape vape = (Vape) producto;
                int stockDisponible = Optional.ofNullable(vape.getVapeSabores())
                        .orElse(Collections.emptySet())
                        .stream()
                        .map(VapeSabor::getStock)
                        .filter(Objects::nonNull)
                        .mapToInt(Integer::intValue)
                        .sum();

                if (stockDisponible < cantidadSolicitada) {
                    throw new AlreadyExistsException("Stock insuficiente para el producto: " + producto.getNombre());
                }

                reducirStockVape(vape, cantidadSolicitada);
                producto.setStock(stockDisponible - cantidadSolicitada);
            } else {
                if (producto.getStock() == null || producto.getStock() < cantidadSolicitada) {
                    throw new AlreadyExistsException("Stock insuficiente para el producto: " + producto.getNombre());
                }

                producto.setStock(producto.getStock() - cantidadSolicitada);
            }

            Double precioUnitario = producto.getPrecio();
            double subtotal = precioUnitario * cantidadSolicitada;

            DetalleVenta.DetalleVentaBuilder detalleBuilder = DetalleVenta.builder()
                    .cantidad(cantidadSolicitada)
                    .precioUnitario(precioUnitario)
                    .subtotal(subtotal);

            if (producto instanceof Perfume) {
                detalleBuilder.perfume((Perfume) producto);
            } else if (producto instanceof Vape) {
                detalleBuilder.vape((Vape) producto);
            }

            DetalleVenta detalleVenta = detalleBuilder.build();
            detalleVenta.setVenta(venta);

            detalles.add(detalleVenta);
            total += subtotal;
        }

        venta.setTotal(total);
        venta.setDetalles(detalles);

        Venta guardada = ventaRepository.save(venta);
        return toResponse(guardada);
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
                .detalles(detalles)
                .build();
    }

    private DetalleVentaResponse toDetalleResponse(DetalleVenta detalle) {
        return DetalleVentaResponse.builder()
                .nombreProducto(detalle.getNombreProducto())
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

    private void reducirStockVape(Vape vape, int cantidad) {
        int restante = cantidad;
        for (VapeSabor vapeSabor : Optional.ofNullable(vape.getVapeSabores())
                .orElse(Collections.emptySet())) {
            if (restante <= 0) {
                break;
            }
            int disponible = Optional.ofNullable(vapeSabor.getStock()).orElse(0);
            if (disponible <= 0) {
                continue;
            }
            int aDescontar = Math.min(disponible, restante);
            vapeSabor.setStock(disponible - aDescontar);
            restante -= aDescontar;
        }

        if (restante > 0) {
            throw new AlreadyExistsException("Stock insuficiente para el producto: " + vape.getNombre());
        }
    }
}

