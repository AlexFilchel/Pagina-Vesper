package org.vesper.controller;

import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.preference.Preference;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.vesper.dto.PreferenciaDTO;
import org.vesper.exception.MercadoPagoIntegrationException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/mercado-pago")
public class MercadoPagoController {

    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoController.class);

    @PostMapping("/preferencia")
    public ResponseEntity<Map<String, String>> crearPreferencia(@Valid @RequestBody PreferenciaDTO dto) {
        try {
            // Crear item
            PreferenceItemRequest item = PreferenceItemRequest.builder()
                    .title(dto.getTitulo())
                    .description(dto.getDescripcion())
                    .quantity(dto.getCantidad())
                    .currencyId("ARS")
                    .unitPrice(dto.getPrecio())
                    .build();

            // Crear preferencia
            List<PreferenceItemRequest> items = new ArrayList<>();
            items.add(item);

            PreferenceRequest preferenceRequest = PreferenceRequest.builder()
                    .items(items)
                    .build();

            PreferenceClient client = new PreferenceClient();
            Preference preference = client.create(preferenceRequest);

            // Devolver init_point
            return ResponseEntity.ok(Map.of("init_point", preference.getInitPoint()));
        } catch (MPApiException e) {
            String apiError = e.getApiResponse() != null ? e.getApiResponse().getContent() : e.getMessage();
            logger.error("Error de API de Mercado Pago (status {}): {}", e.getStatusCode(), apiError, e);
            throw new MercadoPagoIntegrationException("Mercado Pago rechazó la solicitud: " + apiError);
        } catch (MPException e) {
            logger.error("Fallo al comunicarse con Mercado Pago: {}", e.getMessage(), e);
            throw new MercadoPagoIntegrationException("No fue posible comunicarse con Mercado Pago. Intente nuevamente.");
        } catch (IllegalArgumentException e) {
            logger.error("Payload inválido para crear preferencia: {}", e.getMessage(), e);
            throw new MercadoPagoIntegrationException("Los datos enviados son inválidos para Mercado Pago.");
        }
    }
}
