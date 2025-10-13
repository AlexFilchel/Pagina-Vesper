package org.vesper.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
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
     * Construye el servicio configurando el cliente de Cloudinary a partir de las credenciales
     * definidas en el archivo {@code application.properties}.
     *
     * @param cloudName nombre de la cuenta de Cloudinary.
     * @param apiKey    clave pública proporcionada por Cloudinary.
     * @param apiSecret clave privada para autenticar las operaciones.
     */
    public CloudinaryService(
            @Value("${cloudinary.cloud_name}") String cloudName,
            @Value("${cloudinary.api_key}") String apiKey,
            @Value("${cloudinary.api_secret}") String apiSecret
    ) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret
        ));
    }

    /**
     * Sube un archivo a Cloudinary y retorna los datos necesarios para su posterior consulta o
     * eliminación.
     *
     * @param file archivo a subir.
     * @return mapa con la URL pública ({@code url}) y el identificador de Cloudinary
     * ({@code public_id}).
     */
    public Map<String, String> uploadFile(MultipartFile file) {
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            Map<String, String> response = new HashMap<>();
            String secureUrl = (String) uploadResult.getOrDefault("secure_url", uploadResult.get("url"));
            response.put("url", secureUrl);
            response.put("public_id", (String) uploadResult.get("public_id"));
            return response;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al subir la imagen", exception);
        }
    }

    /**
     * Elimina un recurso de Cloudinary empleando su identificador único.
     *
     * @param publicId identificador del recurso almacenado en Cloudinary.
     */
    public void deleteFile(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al eliminar la imagen", exception);
        }
    }
}
