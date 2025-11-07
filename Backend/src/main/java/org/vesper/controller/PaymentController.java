package org.vesper.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.vesper.dto.PreferenciaResponseDTO;
import org.vesper.dto.VentaRequest;
import org.vesper.entity.RegistroPago;
import org.vesper.entity.Venta;
import org.vesper.repo.RegistroPagoRepository;
import org.vesper.repo.VentaRepository;
import org.vesper.service.PaymentService;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final VentaRepository ventaRepository;
    private final RegistroPagoRepository registroPagoRepository;
    private final ObjectMapper objectMapper;

    @Value("${mercadopago.webhook.secret:}")
    private String webhookSecret;

    @PostMapping("/user/payments/crearOrden")
    public ResponseEntity<PreferenciaResponseDTO> crearOrdenYPreferencia(
            @Valid @RequestBody VentaRequest ventaRequest,
            @AuthenticationPrincipal Jwt jwt) {
        logger.info("Se invoco /create-order correctamente");
        PreferenciaResponseDTO response = paymentService.crearOrdenYPrefencia(ventaRequest, jwt);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint publico para recibir notificaciones de Mercado Pago.
     * Procesa los cambios de estado de un pago y actualiza la venta vinculada.
     */
    @PostMapping("/public/payments/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "x-mercadopago-signature", required = false) String signature) throws Exception {

        // Evitar falsos 401 en modo prueba
        if (signature != null && !isSignatureValid(rawPayload, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firma del webhook invalida");
        }

        logger.info("📦 Webhook recibido correctamente desde Mercado Pago");
        logger.debug("Payload: {}", rawPayload);

        paymentService.procesarWebhook(rawPayload);
        return ResponseEntity.ok("Webhook procesado correctamente");
    }


    @GetMapping("/admin/payments/pagos")
    public List<RegistroPago> listarPagos() {
        return registroPagoRepository.findAll();
    }

    @GetMapping("/admin/payments/ventas")
    public List<Venta> listarVentas() {
        return ventaRepository.findAll();
    }

    @GetMapping("/public/payments/success")
    public String pagoExitoso(@RequestParam Map<String, String> params) {
        return "Pago aprobado! Datos: " + params;
    }

    @GetMapping("/public/payments/failure")
    public String pagoFallido(@RequestParam Map<String, String> params) {
        return "Pago fallido. Datos: " + params;
    }

    @GetMapping("/public/payments/pending")
    public String pagoPendiente(@RequestParam Map<String, String> params) {
        return "Pago pendiente. Datos: " + params;
    }

    private boolean isSignatureValid(String rawPayload, String header) throws GeneralSecurityException {
        if (!StringUtils.hasText(webhookSecret)) {
            logger.warn("La propiedad 'mercadopago.webhook.secret' no está configurada. Se omite la validación de firma.");
            // En un entorno de producción estricto, podrías devolver 'false' aquí.
            // Para desarrollo, permitirlo puede ser útil.
            return true;
        }
        if (!StringUtils.hasText(header)) {
            logger.warn("No se recibió encabezado de firma 'x-mercadopago-signature'.");
            return false;
        }
        String[] parts = header.split("=", 2);
        if (parts.length != 2) {
            logger.warn("Formato inesperado para la firma de Mercado Pago: {}", header);
            return false;
        }

        String algorithm = parts[0].trim().toLowerCase(Locale.ROOT);
        if (!"sha256".equals(algorithm)) {
            logger.warn("Algoritmo de firma no soportado: {}", algorithm);
            return false;
        }

        String macAlgorithm = "HmacSHA256";
        String signature = parts[1].trim();

        Mac mac = Mac.getInstance(macAlgorithm);
        mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), macAlgorithm));
        byte[] expected = mac.doFinal(rawPayload.getBytes(StandardCharsets.UTF_8));
        byte[] provided = hexToBytes(signature);

        boolean matches = MessageDigest.isEqual(expected, provided);
        if (!matches) {
            logger.warn("Firma de webhook no coincide. Payload recibido.");
        }
        return matches;
    }

    private byte[] hexToBytes(String hex) {
        if (hex.length() % 2 != 0) {
            throw new IllegalArgumentException("Longitud de firma invalida");
        }
        byte[] data = new byte[hex.length() / 2];
        for (int i = 0; i < hex.length(); i += 2) {
            int hi = Character.digit(hex.charAt(i), 16);
            int lo = Character.digit(hex.charAt(i + 1), 16);
            if (hi < 0 || lo < 0) {
                throw new IllegalArgumentException("Caracteres hexadecimales invalidos");
            }
            data[i / 2] = (byte) ((hi << 4) + lo);
        }
        return data;
    }
}
