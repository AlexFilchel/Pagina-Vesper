package org.vesper.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "imagenes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Imagen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String url;        // URL de Cloudinary
    private String publicId;   // ID de Cloudinary para operaciones
}
