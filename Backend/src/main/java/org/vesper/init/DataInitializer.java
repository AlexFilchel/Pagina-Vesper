package org.vesper.init;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.vesper.entity.Rol;
import org.vesper.repo.RolRepository;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RolRepository rolRepository;

    @Override
    public void run(String... args) throws Exception {
        if (rolRepository.findByNombre("USER").isEmpty()) {
            Rol user = new Rol();
            user.setNombre("USER");
            rolRepository.save(user);
        }
        if (rolRepository.findByNombre("ADMIN").isEmpty()) {
            Rol admin = new Rol();
            admin.setNombre("ADMIN");
            rolRepository.save(admin);
        }
    }
}