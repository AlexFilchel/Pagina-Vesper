package org.vesper.service.payment;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.vesper.dto.PreferenciaResponseDTO;
import org.vesper.dto.VentaRequest;
import org.vesper.entity.MetodoPago;

@Service
@RequiredArgsConstructor
public class PaymentService {


    //Metodos de pago
    private final MercadoPagoService mercadoPagoService;
    private final UalaService ualaService;

    @Value("${mercadopago.base.url}")
    private String baseUrl;


    //Redirigir Al metodo de pago recomendado
    public PreferenciaResponseDTO crearOrdenYPrefencia(VentaRequest request, Jwt jwt) {
        // 1. Aquí usas tu Enum (que viene en el VentaRequest)
        MetodoPago metodo = request.getMetodo();

        // 2. Aquí está tu lógica de "redirigir"
        switch (metodo) {
            case MP:
                return mercadoPagoService.crearOrdenDePago(request, jwt);

            case UALA:
                return ualaService.crearOrdenDePago(request, jwt);

            default:
                throw new IllegalArgumentException("Método de pago no soportado: " + metodo);
        }
    }


}
