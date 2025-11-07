package org.vesper;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class VesperApplication {

	public static void main(String[] args) {
		// 1. Cargar las variables de entorno desde el archivo .env
		loadEnvironmentVariables();

		// 2. Iniciar la aplicación Spring Boot
		SpringApplication.run(VesperApplication.class, args);
	}

	/**
	 * Busca un archivo .env en la raíz del proyecto, lo carga y establece
	 * cada una de sus entradas como una Propiedad del Sistema de Java.
	 */
	private static void loadEnvironmentVariables() {
		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
		dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
	}

}
