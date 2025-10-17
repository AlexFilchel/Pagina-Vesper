    const form = document.getElementById('checkout-form');
    const mensaje = document.getElementById('mensaje');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      mensaje.hidden = true;

      const payload = {
        titulo: form.titulo.value.trim(),
        descripcion: form.descripcion.value.trim(),
        cantidad: Number(form.cantidad.value),
        precio: Number(form.precio.value)
      };

      try {
        const response = await fetch('http://localhost:8080/mercado-pago/preferencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || JSON.stringify(data));
        }

        if (data.init_point) {
          mensaje.className = 'mensaje exito';
          mensaje.textContent = 'Preferencia creada. Redirigiendo…';
          mensaje.hidden = false;
          setTimeout(() => window.location.href = data.init_point, 1000);
        } else {
          throw new Error('La respuesta no contiene init_point');
        }
      } catch (error) {
        mensaje.className = 'mensaje error';
        mensaje.textContent = `No se pudo generar la preferencia: ${error.message}`;
        mensaje.hidden = false;
      }
    });