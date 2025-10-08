package org.vesper.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("scriptgangecommerce@gmail.com");
        message.setTo(toEmail);
        message.setSubject("Recuperación de contraseña - Script Gang");
        message.setText("Hola,\n\n"
                + "Recibimos una solicitud para restablecer tu contraseña.\n"
                + "Haz click en el siguiente link para crear una nueva contraseña:\n\n"
                + resetLink + "\n\n"
                + "Si no solicitaste este cambio, ignora este correo.\n\n"
                + "Gracias,\nScript Gang Team");
        mailSender.send(message);
    }
}
