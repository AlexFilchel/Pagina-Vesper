package org.vesper.service.payment;

import org.springframework.security.oauth2.jwt.Jwt;
import org.vesper.dto.PreferenciaResponseDTO;
import org.vesper.dto.VentaRequest;


public interface IPaymentStrategy<T> {

    /**
     * Crea la orden de pago en la pasarela externa.
     * Devuelve un DTO con la información necesaria para el frontend (ej. URL de pago).
     */
    PreferenciaResponseDTO crearOrdenDePago(VentaRequest request, Jwt jwt);

    /**
     * Procesa una notificación de webhook.
     */
     void procesarWebhook(T data) throws Exception; // El 'Object' dependerá de cada pasarela
}