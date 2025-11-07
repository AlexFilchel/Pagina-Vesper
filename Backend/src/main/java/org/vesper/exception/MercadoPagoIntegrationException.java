package org.vesper.exception;

/**
 * Excepción de negocio para errores al comunicarse con la API de Mercado Pago.
 */
public class MercadoPagoIntegrationException extends VesperException {

    public MercadoPagoIntegrationException(String message) {
        super(message);
    }
}
