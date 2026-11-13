# Plan de pruebas funcionales: LibroNet

Responsable: Marcos Josué García Maldonado (Frontend & UX/QA)
Alcance: la Vista (`public/`) conectada a la API REST del Controlador y al Modelo.

## 1. Objetivo

Certificar, antes de la demostración final, que cada rol puede completar sus flujos, que los descuentos que ve el usuario son los que calcula el Modelo, que las vistas privadas respetan los permisos y que la interfaz funciona en teléfono, tablet y escritorio.

## 2. Entorno

| Elemento | Valor |
| --- | --- |
| Servidor | Node.js 22, Express 5, Socket.IO (`npm start`) |
| Base de datos | PostgreSQL 16 cargada con `database.sql` y `npm run seed` |
| Almacenamiento de portadas | Cloudinary (llaves en `.env`) |
| Navegador | Chromium (Playwright) |
| Anchos de pantalla | 390 px (teléfono), 768 px (tablet), 1366 y 1440 px (escritorio) |
| Datos | 12 libros, 33 productos, usuarios de los cinco roles |

Cuentas de prueba (contraseña `Password123!`):

| Rol | Correo |
| --- | --- |
| Visitante | Sin cuenta |
| Cliente minorista | minorista@editorial.com |
| Cliente institucional | institucional@colegio.edu |
| Asesor de ventas | asesor@editorial.com |
| Administrador | admin@editorial.com |

## 3. Cómo ejecutar las pruebas automatizadas

```bash
# Con el servidor corriendo y la base recién cargada
npm install --no-save playwright
npx playwright install chromium
node pruebas/vista.e2e.mjs                          # usa http://localhost:3000
```

Si el servidor corre en otro puerto:

```bash
BASE_URL=http://localhost:3001 node pruebas/vista.e2e.mjs            # Linux o macOS
$env:BASE_URL="http://localhost:3001"; node pruebas/vista.e2e.mjs    # PowerShell
```

`--no-save` evita modificar `package.json`. El script termina con código 1 si algún caso falla, así que sirve también en integración continua.

## 4. Casos de prueba

Resultado de la última ejecución (12 de noviembre de 2026): 47 de 48 casos aprobados, sin errores en la consola del navegador. Queda pendiente CP-02 (búsqueda por autor), que depende de que el Controlador busque también por autor y editorial (RF-01.2).

### Catálogo y fichas (RF-01)

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| CP-01 | Visitante | Abrir la portada | Muestra banners, estante, novedades y destacados del Controlador |
| CP-02 | Visitante | Escribir un autor en el buscador | Los resultados se actualizan mientras escribe |
| CP-03 | Visitante | Filtrar por género y precio máximo | Solo aparecen libros de ese género bajo ese precio |
| CP-04 | Visitante | Recargar con filtros activos | La URL conserva los filtros |
| CP-05 | Visitante | Buscar un término inexistente | Mensaje de sin resultados y botón para limpiar |
| CP-06 | Visitante | Abrir la ficha de un libro | Portada, sinopsis, autor, editorial, ISBN, año, formato, stock y precio |

### Acceso, registro y roles (RF-02)

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| CP-07 | Visitante | Intentar comprar | Va a iniciar sesión con un aviso |
| CP-08 | Visitante | Escribir un correo inválido | Error de validación al salir del campo |
| CP-09 | Visitante | Contraseña incorrecta | Aviso de credenciales incorrectas |
| CP-10 | Minorista | Iniciar sesión desde la ficha | Regresa a la ficha que estaba viendo |
| CP-20 | Minorista | Abrir `/panel/index.html` | Acceso denegado (403) |
| CP-21 | Minorista | Abrir `/solicitud.html` | Acceso denegado (403) |
| CP-22 | Visitante | Abrir `/carrito.html` | Va a iniciar sesión |
| CP-23 | Visitante | Enviar el registro vacío | Muestra los errores de cada campo |
| CP-24 | Visitante | Registrarse como minorista | Entra al catálogo con su sesión |
| CP-25 | Visitante | Registrarse como institución | Queda pendiente de validación |
| CP-26 | Institucional pendiente | Abrir el catálogo | Aviso de cuenta pendiente |
| CP-36 | Asesor | Abrir `/panel/usuarios.html` | Acceso denegado (403) |
| CP-47 | Administrador | Desactivar una cuenta | La cuenta aparece como inactiva |
| CP-48 | Usuario desactivado | Iniciar sesión | El servidor rechaza el acceso |

### Carrito, descuentos y órdenes (RF-03)

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| CP-11 | Minorista | Agregar 3 unidades desde la ficha | Aviso de 3 unidades agregadas |
| CP-12 | Minorista | Revisar el encabezado | El contador del carrito se actualiza |
| CP-13 | Minorista | Cambiar una cantidad | El resumen se recalcula con la respuesta del Modelo |
| CP-14 | Minorista | Llevar el carrito a 6 unidades | Aplica 5% por volumen |
| CP-15 | Minorista | Revisar el resumen | No aplica descuento institucional |
| CP-16 | Minorista | Confirmar con una dirección corta | Error de validación |
| CP-17 | Minorista | Confirmar la orden | Número de orden con subtotal base, descuentos, IVA y total final |
| CP-18 | Minorista | Abrir Mis pedidos | La orden nueva aparece en el historial |
| CP-19 | Minorista | Ver el detalle de un pedido | Desglose registrado y línea de tiempo del estado |
| CP-27 | Institucional | Vaciar el carrito | Pide confirmación y lo deja vacío |
| CP-28 | Institucional | Comprar 30 unidades | Aplica 10% por volumen y 8% institucional acumulado |

### Cotizaciones (RF-04 y RF-05.3)

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| CP-29 | Institucional | Enviar la solicitud vacía | Errores en título, cantidad, fecha, portada y papel |
| CP-30 | Institucional | Enviar una solicitud de volumen masivo | Código de solicitud generado |
| CP-31 | Asesor | Iniciar sesión | Entra a su bandeja |
| CP-32 | Asesor | Abrir la solicitud | Muestra el tipo de solicitud y los requerimientos |
| CP-33 | Asesor | Escribir el precio unitario | Sugiere el total según la cantidad solicitada |
| CP-34 | Asesor | Emitir la cotización | La solicitud pasa a Cotizada |
| CP-37 | Institucional | Abrir la cotización | Ve el total propuesto y las condiciones |
| CP-38 | Institucional | Aprobar la cotización | La solicitud pasa a Aprobada por Cliente |

### Administración (RF-05)

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| CP-35 | Asesor | Validar una institución | Sale de la lista de pendientes |
| CP-39 | Administrador | Iniciar sesión | Entra al resumen con órdenes por estado |
| CP-40 | Administrador | Editar el precio de un libro | La tabla muestra el precio nuevo |
| CP-41 | Administrador | Agregar un formato nuevo de un libro | Aparece en el catálogo |
| CP-42 | Administrador | Eliminar ese producto | Eliminación lógica: deja de listarse |
| CP-44 | Administrador | Recorrer las pestañas del catálogo | Libros, existencias, autores, géneros y editoriales |
| CP-45 | Administrador | Cambiar una orden a Enviado | El estado se guarda |
| CP-46 | Administrador | Filtrar órdenes por Enviado | Solo aparecen órdenes enviadas |

### Seguridad en la Vista

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| CP-43 | Administrador | Crear un autor llamado `<img src=x onerror=alert(1)>` | Se muestra como texto; no se ejecuta ningún script |
| CP-49 | Todos | Recorrer todos los flujos | Sin errores en la consola del navegador |

## 5. Pruebas manuales

Se ejecutan a mano porque dependen de servicios externos o de la interacción con el mouse.

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| CP-50 | Administrador | Editar un libro y subir una portada JPG o PNG | Vista previa antes de guardar; al guardar, la portada aparece en la tabla, la ficha y el estante, servida desde `res.cloudinary.com` |
| CP-51 | Administrador | Crear un libro nuevo con portada | La portada se sube primero a Cloudinary y su URL queda guardada en el libro |
| CP-52 | Administrador | Elegir un PDF o una imagen de más de 5 MB | La Vista la rechaza con un aviso antes de enviarla |
| CP-53 | Administrador | Subir portada sin llaves de Cloudinary en el `.env` | Aviso claro de que faltan las llaves, sin error genérico |
| CP-54 | Visitante | Girar la rueda del mouse sobre el estante de la portada | El estante recorre todos los ejemplares; al llegar al final, la página sigue bajando |
| CP-55 | Visitante | Esperar en la portada | Las frases cambian cada 8 segundos y se detienen al pasar el mouse o con el botón de pausa |
| CP-56 | Visitante | Abrir Crear cuenta y cambiar entre personal e institucional | El panel de marca cambia el mensaje y las ventajas de cada tipo de cuenta |

## 6. Pruebas de diseño responsivo

Se revisaron todas las vistas en 390, 768 y 1440 px sin desplazamiento horizontal de la página.

| Componente | Teléfono | Tablet | Escritorio |
| --- | --- | --- | --- |
| Navegación de la tienda | Menú desplegable | Menú desplegable | Barra de enlaces |
| Panel de asesor y administrador | Menú lateral deslizable | Menú lateral deslizable | Barra lateral fija |
| Catálogo | 2 columnas, filtros plegables | 3 columnas, filtros plegables | Filtros laterales y 3 columnas |
| Tablas del panel | Fichas por registro | Fichas por registro | Tabla completa |

## 7. Rendimiento

Tiempo desde la navegación hasta que la vista muestra los datos, en entorno local:

| Vista | Tiempo |
| --- | --- |
| Inicio | 137 ms |
| Catálogo | 117 ms |
| Ficha del libro | 99 ms |
| Resumen del administrador | 87 ms |
| Gestión de catálogo | 110 ms |
| Usuarios | 79 ms |
| Órdenes | 82 ms |
| Bandeja de cotizaciones | 82 ms |

Todas están por debajo del límite de 2 segundos.

## 8. Criterio de aceptación

La entrega se certifica cuando los 48 casos automatizados pasan sobre una base recién cargada, los casos manuales se cumplen, la consola queda sin errores y la revisión responsiva no muestra desbordes.
