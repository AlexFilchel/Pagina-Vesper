package org.vesper.config;

import lombok.Data;
import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.vesper.security.AuthEntryPoint;
import org.vesper.security.JwtFilter;
import org.vesper.service.UserDetailsServiceImpl;

@Data
@Configuration
@RequiredArgsConstructor
@EnableWebSecurity
public class SecurityConfig {

    private final AuthEntryPoint authEntryPoint;
    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception{//sirve para definir que rutas seran públicas y privadas

        http.csrf(csrf -> csrf.disable());  //desactiva csrf porque se va a usar JWT

        http.authorizeHttpRequests( auth -> auth
                // Endpoints públicos (sin autenticación)
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/perfumes", "/perfumes/{id}", "/perfumes/buscar").permitAll()
                .requestMatchers("/vapers", "/vapers/{id}", "/vapers/buscar").permitAll()
                .requestMatchers("/sabores", "/sabores/{id}").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                
                // Endpoints administrativos (requieren rol ADMIN o SUPERADMIN)
                .requestMatchers("/perfumes/**").hasAnyRole("ADMIN", "SUPERADMIN")
                .requestMatchers("/vapers/**").hasAnyRole("ADMIN", "SUPERADMIN")
                .requestMatchers("/sabores/**").hasAnyRole("ADMIN", "SUPERADMIN")
                
                // Endpoints de gestión de usuarios (solo SUPERADMIN)
                .requestMatchers("/admin/users/**").hasRole("SUPERADMIN")
                
                // Cualquier otra petición requiere autenticación
                .anyRequest().authenticated()
        );

        http.exceptionHandling(ex -> ex.authenticationEntryPoint(authEntryPoint));
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class); //antes de que se ejecute el filtro por defecto va JwtFilter
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(UserDetailsServiceImpl userDetailsService,
                                                         PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

}
