package org.vesper.config;

import com.mercadopago.MercadoPagoConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;
import org.springframework.util.StringUtils;

@Configuration
public class MercadoPagoInitializer {

    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoInitializer.class);

    @Value("${mercadopago.access-token}")
    private String accessToken;

    @PostConstruct
    public void init() {
        if (!StringUtils.hasText(accessToken)) {
            throw new IllegalStateException("El token de acceso de Mercado Pago no está configurado");
        }

        try {
            MercadoPagoConfig.setAccessToken(accessToken);
            logger.info("Mercado Pago SDK inicializado correctamente");
        } catch (Exception ex) {
            logger.error("Error al inicializar Mercado Pago SDK: {}", ex.getMessage(), ex);
            throw new IllegalStateException("No se pudo inicializar Mercado Pago con el token configurado", ex);
        }
    }
}
