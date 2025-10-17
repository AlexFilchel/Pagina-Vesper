package org.vesper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.mercadopago.MercadoPagoConfig;

@SpringBootApplication
public class VesperApplication {

    public static void main(String[] args) {
        MercadoPagoConfig.setAccessToken(System.getenv("MERCADOPAGO_ACCESS_TOKEN"));
        SpringApplication.run(VesperApplication.class, args);
    }

}
