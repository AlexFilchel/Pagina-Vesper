package org.vesper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class VesperApplication {

	public static void main(String[] args) {
		// Cargar variables de entorno desde .env si existe
		io.github.cdimascio.dotenv.Dotenv dotenv = io.github.cdimascio.dotenv.Dotenv.configure()
			.directory("./") // Busca en la raíz del proyecto (donde se ejecute)
			.ignoreIfMissing()
			.load();

		dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));

		// Iniciar la aplicación Spring Boot
		SpringApplication.run(VesperApplication.class, args);
	}

}
