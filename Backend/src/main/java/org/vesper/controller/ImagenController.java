package org.vesper.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.vesper.dto.ImagenResponse;
import org.vesper.entity.Imagen;
import org.vesper.entity.Producto;
import org.vesper.repo.ImagenRepository;
import org.vesper.repo.ProductoRepository;
import org.vesper.service.CloudinaryService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controlador REST encargado de gestionar la carga, consulta y eliminación de imágenes en Cloudinary
 * asociadas a productos del catálogo.
 */
@RestController
@RequestMapping("/api")
public class ImagenController {

    private final CloudinaryService cloudinaryService;
    private final ImagenRepository imagenRepository;
    private final ProductoRepository productoRepository;

    public ImagenController(CloudinaryService cloudinaryService,
                            ImagenRepository imagenRepository,
                            ProductoRepository productoRepository) {
        this.cloudinaryService = cloudinaryService;
        this.imagenRepository = imagenRepository;
        this.productoRepository = productoRepository;
    }

    /**
     * Sube de manera secuencial una o varias imágenes a Cloudinary y las asocia al producto indicado.
     *
     * @param productoId identificador del producto destinatario de las imágenes.
     * @param files      listado de archivos recibido en formato {@code multipart/form-data}.
     * @return lista de {@link ImagenResponse} correspondiente a las imágenes almacenadas.
     */
    @PostMapping("/admin/imagenes/producto/{productoId}")
    public ResponseEntity<List<ImagenResponse>> uploadImages(@PathVariable Long productoId,
                                                             @RequestParam("files") List<MultipartFile> files) {
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));

        List<ImagenResponse> responses = new ArrayList<>();
        for (MultipartFile file : files) {
            Map<String, String> uploadResult = cloudinaryService.uploadFile(file);
            Imagen imagen = new Imagen();
            imagen.setUrl(uploadResult.get("url"));
            imagen.setPublicId(uploadResult.get("public_id"));
            imagen.setProducto(producto);
            imagenRepository.save(imagen);
            producto.getImagenes().add(imagen);
            responses.add(ImagenResponse.builder()
                    .id(imagen.getId())
                    .url(imagen.getUrl())
                    .build());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    /**
     * Recupera todas las imágenes asociadas al producto indicado.
     *
     * @param productoId identificador del producto del que se requieren las imágenes.
     * @return lista de {@link ImagenResponse} con los datos relevantes para el frontend.
     */
    @GetMapping("/admin/imagenes/producto/{productoId}")
    public ResponseEntity<List<ImagenResponse>> getImagesByProducto(@PathVariable Long productoId) {
        if (!productoRepository.existsById(productoId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado");
        }
        List<ImagenResponse> responses = imagenRepository.findByProductoId(productoId)
                .stream()
                .map(imagen -> ImagenResponse.builder()
                        .id(imagen.getId())
                        .url(imagen.getUrl())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    /**
     * Elimina una imagen del producto y del repositorio remoto de Cloudinary.
     *
     * @param id identificador de la imagen a eliminar.
     * @return mensaje de confirmación en formato JSON.
     */
    @DeleteMapping("/admin/imagenes/{id}")
    public ResponseEntity<Map<String, String>> deleteImage(@PathVariable Long id) {
        Imagen imagen = imagenRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagen no encontrada"));

        cloudinaryService.deleteFile(imagen.getPublicId());
        Producto producto = imagen.getProducto();
        if (producto != null) {
            producto.getImagenes().removeIf(img -> img.getId().equals(id));
        }
        imagenRepository.delete(imagen);
        return ResponseEntity.ok(Collections.singletonMap("message", "Imagen eliminada correctamente"));
    }
}
