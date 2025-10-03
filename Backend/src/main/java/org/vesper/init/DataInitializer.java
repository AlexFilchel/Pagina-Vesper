package org.vesper.init;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.vesper.entity.*;
import org.vesper.repo.*;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final SaborRepository saborRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        initUsuarios();
        initSabores();
        // acá podrías ir agregando más initX() en el futuro
    }

    private void initUsuarios() {
        if (usuarioRepository.findByEmail("admin@admin.com").isEmpty()) {
            Usuario admin = Usuario.builder()
                    .nombre("Admin")
                    .apellido("Principal")
                    .email("admin@admin.com")
                    .password(passwordEncoder.encode("admin123"))
                    .rol(Rol.SUPERADMIN)
                    .build();
            usuarioRepository.save(admin);
        }
    }

    private void initSabores() {
        List<String> saboresBase = List.of("Menta", "Frutilla", "Vainilla", "Uva", "Tabaco");
        for (String nombre : saboresBase) {
            if (saborRepository.findByNombre(nombre).isEmpty()) {
                saborRepository.save(Sabor.builder().nombre(nombre).build());
            }
        }
    }
}
