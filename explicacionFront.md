El análisis de la carpeta `Frontend` revela una aplicación de comercio electrónico bien estructurada y funcional para el sitio "Vesper". A continuación, se presenta un resumen detallado:

### **Estructura General**

*   **Tecnología:** El frontend está construido con HTML, CSS y JavaScript puro, sin el uso de frameworks de alto nivel como React o Angular. Esto le da un control total sobre el DOM y el rendimiento.
*   **Autenticación:** Utiliza **Auth0** para la gestión de usuarios, lo cual es una solución robusta y segura para el inicio de sesión y registro.
*   **Diseño Responsivo:** El sitio está diseñado para ser completamente funcional en dispositivos móviles y de escritorio, con una interfaz que se adapta a diferentes tamaños de pantalla.
*   **API Backend:** Se comunica con un backend a través de un `api.js` bien definido, que maneja todas las solicitudes HTTP para obtener y manipular datos de productos, usuarios y promociones.

### **Archivos HTML**

*   `index.html`: Es la página principal que incluye un carrusel de imágenes, una sección de beneficios, categorías de productos y una lista de productos destacados que se cargan dinámicamente.
*   `admin.html`: Un panel de administración completo para gestionar productos (perfumes, vapes, decants) y promociones. Incluye formularios para agregar y editar productos, así como tablas para visualizar los datos.
*   `checkout-entrega.html`: La página de pago donde los usuarios seleccionan el método de entrega, gestionan sus direcciones y eligen cómo pagar.
*   `productos.html`: La página de listado de productos, que cuenta con un sistema de filtros por tipo, género, marca y precio, además de opciones de ordenamiento.

### **Archivos CSS**

*   `style.css`: La hoja de estilos principal que define la apariencia general del sitio, incluyendo el encabezado, pie de página, modales y otros elementos comunes.
*   `admin.css`: Estilos específicos para el panel de administración.
*   `checkout.css`: Estilos para la página de pago.
*   `productos.css`: Estilos para la página de listado de productos.

### **Archivos JavaScript**

*   `main.js`: El archivo principal que maneja la interactividad del sitio, como el carrusel, el menú móvil, la búsqueda, el modal de perfil de usuario y el carrito de compras.
*   `api.js`: Un módulo dedicado para la comunicación con el backend. Centraliza todas las llamadas a la API para una fácil gestión.
*   `auth0-config.js`: Configura e inicializa el SDK de Auth0, manejando el flujo de autenticación.
*   `admin.js`: La lógica para el panel de administración, permitiendo la creación, edición y eliminación de productos y promociones.
*   `checkout-entrega.js`: Gestiona la lógica de la página de pago, como la selección de métodos de entrega y pago.

### **Imágenes (carpeta `img`)**

Contiene los recursos visuales del sitio, como el logo, imágenes para el carrusel y las categorías de productos.

### **Conclusión**

El frontend de "Vesper" es una aplicación de comercio electrónico sólida y bien desarrollada. La separación de responsabilidades entre los archivos es clara, y el uso de JavaScript puro demuestra un buen entendimiento de la manipulación del DOM y la gestión de eventos. La integración con Auth0 y una API de backend bien definida hacen de esta una solución completa y funcional.
