package org.vesper.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.validation.ConstraintViolationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Manejador global de excepciones para la aplicación Vesper.
 * Captura excepciones de negocio y errores inesperados,
 * generando respuestas uniformes en formato JSON para el frontend.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Maneja errores de validación en @RequestBody (DTOs).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.put(error.getField(), error.getDefaultMessage()));

        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("error", "Error de validación");
        response.put("details", fieldErrors);

        logger.warn("Error de validación: {}", fieldErrors);

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Maneja errores de validación en @RequestParam / @PathVariable.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolationException(ConstraintViolationException ex) {
        Map<String, String> violations = new HashMap<>();
        ex.getConstraintViolations()
                .forEach(cv -> violations.put(cv.getPropertyPath().toString(), cv.getMessage()));

        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("error", "Error de validación");
        response.put("details", violations);

        logger.warn("Error de validación: {}", violations);

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Maneja todas las excepciones de negocio que heredan de VesperException.
     *
     * @param ex La excepción de negocio lanzada.
     * @return ResponseEntity con JSON de error y el status HTTP correspondiente.
     */
    @ExceptionHandler(VesperException.class)
    public ResponseEntity<Map<String, Object>> handleVesperException(VesperException ex) {
        HttpStatus status = resolveHttpStatus(ex);
        String message = ex.getMessage();

        logger.warn("Error de negocio [{}]: {}", status.value(), message);

        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", status.value());
        response.put("error", message);

        return ResponseEntity.status(status).body(response);
    }

    /**
     * Maneja cualquier excepción no controlada.
     *
     * @param ex La excepción genérica lanzada.
     * @return ResponseEntity con JSON de error genérico y status 500.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        logger.error("Error inesperado: {}", ex.getMessage(), ex);

        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        response.put("error", "Internal Server Error");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    /**
     * Determina el código HTTP correspondiente según el tipo de VesperException.
     *
     * @param ex La excepción de negocio lanzada.
     * @return HttpStatus correspondiente al tipo de excepción.
     */
    private HttpStatus resolveHttpStatus(VesperException ex) {
        if (ex instanceof ResourceNotFoundException) {
            return HttpStatus.NOT_FOUND;
        } else if (ex instanceof AlreadyExistsException) {
            return HttpStatus.BAD_REQUEST;
        } else if (ex instanceof InvalidCredentialsException) {
            return HttpStatus.UNAUTHORIZED;
        } else if (ex instanceof UnauthorizedException) {
            return HttpStatus.FORBIDDEN;
        } else {
            return HttpStatus.BAD_REQUEST;
        }
    }
}
