package org.vesper.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Servicio responsable de administrar las operaciones con Cloudinary, incluyendo la carga y la
 * eliminación de recursos multimedia.
 */
@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;


    /**
     * Construye el servicio configurando el cliente de Cloudinary a partir de la
     * URL definida en {@code application.properties} o como variable de entorno CLOUDINARY_URL.
     *
     * @param cloudinaryUrl la URL completa de conexión a Cloudinary
     *                      (formato: cloudinary://<api_key>:<api_secret>@<cloud_name>)
     */
    public CloudinaryService(@Value("${cloudinary.url}") String cloudinaryUrl) {
        this.cloudinary = new Cloudinary(cloudinaryUrl);
    }


    /**
     * Sube un archivo a Cloudinary y retorna los datos necesarios para su posterior consulta o
     * eliminación.
     *
     * @param file archivo a subir.
     * @return mapa con la URL pública ({@code url}) y el identificador de Cloudinary
     * ({@code public_id}).
     */
    public Map<String, String> subirImagen(MultipartFile file) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = (Map<String, Object>) cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("folder", "productos")
            );

            String secureUrl = (String) uploadResult.get("secure_url");
            if (secureUrl == null) secureUrl = (String) uploadResult.get("url");

            // 🔹 Crear el mapa de respuesta:
            Map<String, String> response = new HashMap<>();
            response.put("url", secureUrl);
            response.put("public_id", (String) uploadResult.get("public_id"));

            return response;
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error al subir la imagen",
                    exception
            );
        }
    }


    /**
     * Elimina un recurso de Cloudinary empleando su identificador único.
     *
     * @param publicId identificador del recurso almacenado en Cloudinary.
     */
    public void borrarImagen(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al eliminar la imagen", exception);
        }
    }

    @PostConstruct
    public void testConnection() {
        try {
            Map<?, ?> result = cloudinary.api().ping(ObjectUtils.emptyMap());
            System.out.println("Cloudinary conectado correctamente: " + result);
        } catch (Exception e) {
            System.err.println("Error al conectar con Cloudinary: " + e.getMessage());
        }
    }

}
