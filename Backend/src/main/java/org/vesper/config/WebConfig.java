package org.vesper.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Configura las políticas de Cross-Origin Resource Sharing (CORS) para la aplicación.
     * Esto permite que el frontend (ej. desde http://127.0.0.1:5500) pueda hacer
     * peticiones a este backend (ej. en http://localhost:8080) sin ser bloqueado
     * por el navegador.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // Permite CORS para todas las rutas bajo /api/
                .allowedOrigins(
                        "http://127.0.0.1:5500", // Origen del frontend en desarrollo
                        "http://localhost:5500"  // Otro origen común en desarrollo
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Métodos HTTP permitidos
                .allowedHeaders("*") // Permite todas las cabeceras
                .allowCredentials(true); // Permite el envío de cookies y cabeceras de autenticación
    }
}