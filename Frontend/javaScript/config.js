// config.js

window.API_URL = ""; // Por defecto, vacío (para cuando esté en Hostinger/Docker)

// Preguntamos: ¿Estoy corriendo en el Live Server (puerto 5500)?
if (window.location.port === "5500") {
    // Si la respuesta es SÍ, fuérzalo a buscar el backend en el 8080
    window.API_URL = "";
}

// En cualquier otro caso (como en Hostinger), window.API_URL se queda vacío ""
// y usará la ruta relativa automáticamente.