# Plataforma Web Editorial Multicanal (Arquitectura MVC)

> **Proyecto Final de Arquitectura de Sistemas I · CITEIN 2026**  
> Facultad de Ingeniería, Universidad Mesoamericana, Quetzaltenango  
> Implementación rigurosa del patrón arquitectónico **Modelo-Vista-Controlador (MVC)** con Node.js, Express, Sequelize ORM y PostgreSQL.

## Equipo

| Integrante | Rol en el proyecto |
| --- | --- |
| Sebastián Rodrigo Rodas Pineda | Líder Técnico & Arquitecto MVC / Backend (Modelo) |
| Arturo Alejandro Maldonado Orozco | Ingeniero de Software / Controlador e Integraciones |
| Marcos Josué García Maldonado | Desarrollador Frontend & UX/QA (Vista y pruebas) |

Proyecto final del curso Arquitectura de Sistemas I, presentado en el CITEIN 2026 de la Facultad de Ingeniería de la Universidad Mesoamericana, Quetzaltenango.

---

## 1. Diagrama de Arquitectura de Sistemas

El sistema implementa una estricta separación de responsabilidades bajo el patrón **Modelo-Vista-Controlador (MVC)**, garantizando desacoplamiento efectivo entre la capa de presentación, la orquestación HTTP y las reglas de negocio de dominio.

```
                           +-----------------------------------------------+
                           |     NAVEGADOR (teléfono, tablet o escritorio) |
                           +-----------------------+-----------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                    CAPA VISTA (View) - public/                                    |
|                                                                                                   |
|  - *.html, panel/*.html  : Tienda: portada, catálogo, ficha, carrito, pago, pedidos, cotizaciones |
|                            y paneles del asesor y del administrador                               |
|  - js/pages/*.js         : Un script por vista; valida formularios en tiempo de entrada           |
|  - js/core/api.js        : Único contacto con el Controlador (fetch con JWT en el encabezado)     |
|  - js/core/dom.js        : Inserta todo el texto con textContent (protección contra XSS)          |
|  - css/libronet.css      : Diseño responsivo con Flexbox y CSS Grid                               |
|                                                                                                   |
|  No accede a la base de datos ni recalcula precios: muestra lo que responde el Controlador.       |
+---------------------------------------------------------------------------------------------------+
                                                   |
                         HTTP / JSON / REST  (Authorization: Bearer <JWT>)
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                   CAPA CONTROLADOR (Controller)                                   |
|                                                                                                   |
|  - auth.controller.js       : Autenticación, JWT, registro minorista/institucional, gestión RBAC  |
|  - catalogo.controller.js   : Búsqueda multifiltro en tiempo real, catálogo, landing y CRUD admin |
|  - carrito.controller.js    : Gestión de carritos, persistencia de ítems y consumo del Modelo     |
|  - orden.controller.js      : Checkout, Idempotencia (HMAC-SHA256), temporizador de 10 minutos    |
|  - cotizacion.controller.js : Gestión comercial B2B, solicitudes especiales y propuestas formales |
|                                                                                                   |
|  Middlewares & Utils:                                                                             |
|  - auth.middleware.js       : Verificación de JWT y Control de Acceso Basado en Roles (RBAC)      |
|  - idempotencia.js          : Control de peticiones duplicadas mediante HMAC y IDEMPOTENCY_KEY    |
+------------------------------------------+--------------------------------------------------------+
                                           |
                                  Invoca métodos del Modelo
                                           |
                                           v
+---------------------------------------------------------------------------------------------------+
|                                      CAPA MODELO (Model)                                          |
|                                                                                                   |
|  Lógica de Negocio y Reglas Dinámicas de Descuento (RF-03.2):                                     |
|  - Carritos.calcularTotales : Matriz de descuento por volumen (0%, 5%, 10%, 15%) y acumulable     |
|                               institucional (+8%) + cálculo de impuestos IVA                      |
|  - Orden.calcularTotales    : Liquidación exacta y desglose de reglas de negocio en compra       |
|                                                                                                   |
|  Entidades y Mapeo Objeto-Relacional (Sequelize ORM):                                             |
|  - Usuario, Rol, PerfilInstitucional                                                              |
|  - Libros, Autores, Generos, Editoriales, Formatos, Catalogo_Productos                            |
|  - Carritos, CarritoItem, Orden, OrdenDetalle, CotizacionSolicitud, CotizacionPropuesta           |
+------------------------------------------+--------------------------------------------------------+
                                           |
                                   Consultas SQL / DDL / DML
                                           |
                                           v
+---------------------------------------------------------------------------------------------------+
|                                BASE DE DATOS RELACIONAL (PostgreSQL)                              |
|                                 Esquema normalizado con 20 tablas                                 |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Estructura de Carpetas MVC

```text
Arqui1-Backend/
├── config/
│   ├── cloudinary.js           # SDK Cloudinary para subida y almacenamiento de portadas
│   ├── db.js                   # Configuración del pool de conexiones Sequelize a PostgreSQL
│   ├── initDb.js               # Aseguramiento de roles iniciales del sistema
│   └── swagger.js              # Especificación OpenAPI 3.0 / Swagger UI interactivo
├── controllers/
│   ├── auth.controller.js      # Autenticación, perfiles y gestión RBAC de usuarios
│   ├── carrito.controller.js   # Gestión de carritos y consumo de lógica del Modelo
│   ├── catalogo.controller.js  # Catálogo bibliográfico, búsqueda multifiltro y subida de portadas
│   ├── cotizacion.controller.js# Solicitudes y propuestas comerciales B2B
│   ├── orden.controller.js     # Checkout, sesiones de 10 min, idempotencia y confirmación
│   └── reportes.controller.js  # Métricas financieras, reportería en tiempo real y dashboard
├── docs/
│   └── PLAN_DE_PRUEBAS.md      # Plan de pruebas funcionales (QA)
├── middlewares/
│   ├── auth.middleware.js      # Interceptores para JWT y autorización por roles (RBAC)
│   └── upload.middleware.js    # Multer en memoria para procesar imágenes hacia Cloudinary
├── models/
│   ├── Autores.js              # Entidad de autores
│   ├── Carrito_Items.js        # Ítems en el carrito de compras
│   ├── Carritos.js             # Carrito + MOTOR DE DESCUENTOS EN EL MODELO
│   ├── Catalogo_Productos.js   # Variantes por formato, stock y precio base
│   ├── Checkout_Sesiones.js    # Sesiones de checkout persistidas (10 min, items JSONB, estado)
│   ├── Cotizacion_Propuesta.js # Propuestas formales de cotización emitidas por asesores
│   ├── Cotizacion_Solicitud.js # Solicitudes de pedidos especiales de clientes institucionales
│   ├── Editoriales.js          # Entidad de casas editoriales
│   ├── Formatos.js             # Formatos (Físico Tapa Blanda, Tapa Dura, E-Book, Audio)
│   ├── Generos.js              # Géneros literarios
│   ├── Idempotencias.js        # Persistencia dual de llaves de idempotencia y respuestas cacheadas
│   ├── index.js                # Asociación de relaciones ORM y exportación centralizada
│   ├── Libros.js               # Entidad principal de obras literarias (incluye portada_url)
│   ├── Libros_Autores.js       # Tabla asociativa N:M libros-autores
│   ├── Libros_Editoriales.js   # Tabla asociativa N:M libros-editoriales
│   ├── Libros_Generos.js       # Tabla asociativa N:M libros-géneros
│   ├── Orden.js                # Encabezado de orden de compra + liquidación de modelo
│   ├── Orden_Detalle.js        # Líneas de venta con precio histórico y subtotal
│   ├── Perfiles_Institucionales.js # Datos corporativos de clientes mayoristas
│   ├── Rol.js                  # Catálogo de roles del sistema
│   └── Usuario.js              # Cuentas de usuario con hash seguro de contraseñas
├── pruebas/
│   └── vista.e2e.mjs           # 48 pruebas automatizadas de los flujos (Playwright)
├── public/                     # VISTA: interfaz responsiva servida con express.static
│   ├── index.html              # Portada: frases, estante con todo el catálogo, novedades y destacados
│   ├── catalogo.html           # Búsqueda en tiempo real y filtros combinables
│   ├── libro.html              # Ficha técnica del libro
│   ├── login.html              # Inicio de sesión y registro personal o institucional
│   ├── carrito.html            # Carrito con la liquidación que calcula el Modelo
│   ├── checkout.html           # Cierre de orden
│   ├── pedidos.html            # Historial y detalle de pedidos
│   ├── solicitud.html          # Solicitud especial (cliente institucional)
│   ├── cotizaciones.html       # Cotizaciones recibidas (cliente institucional)
│   ├── panel/                  # Resumen, catálogo, usuarios, instituciones, órdenes y bandeja
│   ├── css/libronet.css        # Estilos con Flexbox y CSS Grid
│   ├── img/                    # Logotipo y favicon
│   └── js/
│       ├── core/               # api.js, session.js, dom.js, components.js, layout.js, frases.js
│       └── pages/              # Un script por vista
├── routes/
│   ├── auth.routes.js          # Rutas de autenticación y gestión de usuarios
│   ├── carrito.routes.js       # Rutas del carrito de compras
│   ├── catalogo.routes.js      # Rutas de productos, filtros, metadatos y portadas
│   ├── cotizacion.routes.js    # Rutas de cotizaciones comerciales B2B
│   ├── orden.routes.js         # Rutas de órdenes, checkout de 10 minutos y confirmación
│   └── reportes.routes.js      # Rutas del dashboard de reportería en tiempo real
├── services/
│   └── socket.service.js       # Servidor WebSockets (Socket.IO) para checkout y reportería
├── scripts/
│   └── seed.js                 # Semilla con 12 libros y los 5 roles de usuario
├── utils/
│   └── idempotencia.js         # Motor criptográfico de idempotencia (HMAC-SHA256) dual
├── .env                        # Variables de entorno locales
├── .env.example                # Plantilla de variables de entorno
├── app.js                      # Configuración de Express, Swagger UI y rutas modulares
├── database.sql                # Entregable DDL + DML exportado para evaluación
├── package.json                # Dependencias y scripts de ejecución
├── REQUIREMENTS.md             # Guía oficial de requerimientos del proyecto
└── server.js                   # Punto de entrada HTTP + WebSocket con auto-fallback de puertos
```

---

## 3. Guía de Instalación y Ejecución Paso a Paso

### Requisitos Previos
- **Node.js**: v18.0.0 o superior (recomendado v20+).
- **PostgreSQL**: v13 o superior.
- **Git** instalado.

### Paso 1: Clonar el Repositorio y Ubicarse en el Proyecto
```bash
git clone https://github.com/RodPin25/Arqui1-Backend.git
cd Arqui1-Backend
```

### Paso 2: Instalar Dependencias
```bash
npm install
```

### Paso 3: Configurar Variables de Entorno (`.env`)
Crear un archivo `.env` en la raíz del proyecto basándose en `.env.example`:
```env
# Bases de datos PostgreSQL
DB_HOST=localhost
DB_NAME=Arqui1
DB_USER=postgres
DB_PASS=tu_contraseña
DB_PORT=5432

# Configuraciones de Seguridad de la Aplicación
SECRET_KEY="clave_secreta_para_firmar_jwt_access_token"
REFRESH_TOKEN="clave_secreta_para_firmar_refresh_token"
PORT=3000

# Llave de Idempotencia para firma HMAC de transacciones de compra
IDEMPOTENCY_KEY="una_clave_larga_y_secreta"

# Integración con Cloudinary (Almacenamiento en la nube de portadas de libros)
CLOUD_NAME="tu_cloud_name"
API_KEY="tu_api_key"
API_SECRET="tu_api_secret"
```

### Paso 4: Crear y Cargar la Base de Datos
Crear la base, cargar el esquema completo con los datos (DDL + DML) y asegurar los usuarios de prueba:
```bash
createdb -U postgres Arqui1
psql -U postgres -d Arqui1 -f database.sql
npm run seed
```

*(Nota)* Si `psql` muestra `invalid command \restrict`, se trata de una versión anterior de `psql`: borrar la primera línea `\restrict ...` y la última `\unrestrict ...` de `database.sql` y volver a ejecutar.

### Paso 5: Levantar el Servidor
```bash
# Modo desarrollo con recarga automática:
npm run dev

# Modo producción:
npm start
```

El servidor estará escuchando en: `http://localhost:3000` (o `3001` si el 3000 está ocupado)  
- **Tienda y paneles (Vista):** `http://localhost:3000`
- **Documentación Swagger UI interactiva:** `http://localhost:3000/api-docs` (o `/docs`)
- **Especificación OpenAPI (JSON):** `http://localhost:3000/api-docs.json`
- **Verificación de salud:** `http://localhost:3000/api/health`

---

## 4. Credenciales de Acceso de Prueba (5 Roles Estrictos)

Todas las cuentas semilla tienen la contraseña predeterminada: **`Password123!`**

| Rol del Sistema | Correo Electrónico | Contraseña | Capacidades y Alcance |
|---|---|---|---|
| **1. Visitante (Anónimo)** | *(Sin credencial)* | *(N/A)* | Navegación libre por catálogo, landing, búsqueda multifiltro y ficha técnica. |
| **2. Cliente Minorista** | `minorista@editorial.com` | `Password123!` | Carrito estándar, compras individuales, historial de pedidos propios. |
| **3. Cliente Institucional** | `institucional@colegio.edu` | `Password123!` | Cuenta verificada para compras a volumen, descuento del 8% adicional y cotizaciones. |
| **3b. Cliente Institucional (Pendiente)** | `institucional2@universidad.edu` | `Password123!` | Cuenta en revisión para probar el flujo de aprobación comercial de asesores. |
| **4. Asesor de Ventas** | `asesor@editorial.com` | `Password123!` | Bandeja de cotizaciones B2B, emisión de propuestas formales, monitoreo de órdenes. |
| **5. Administrador** | `admin@editorial.com` | `Password123!` | Control total, CRUD de libros y stock, gestión de usuarios y roles. |

---

## 5. Lógica de Negocio en el Modelo: Motor de Descuentos (RF-03.2)

Cumpliendo con la restricción de diseño donde **la lógica de cálculo debe ejecutarse exclusivamente dentro de la capa del Modelo**, el método estático `Carritos.calcularTotales` (y su alias `Orden.calcularTotales`) implementa la siguiente matriz matemática:

### Matriz de Reglas
1. **Descuento por Volumen (Unidades por título o combinación):**
   - $1 \text{ a } 5 \text{ unidades}: 0\%$
   - $6 \text{ a } 20 \text{ unidades}: 5\%$ sobre el subtotal base.
   - $21 \text{ a } 50 \text{ unidades}: 10\%$ sobre el subtotal base.
   - $\text{Más de } 50 \text{ unidades}: 15\%$ sobre el subtotal base.
2. **Descuento Adicional por Tipo de Cliente:**
   - **Cliente Minorista:** $0\%$ adicional.
   - **Cliente Institucional / Mayorista:** $8\%$ adicional **acumulativo**, aplicado sobre el subtotal tras el descuento por volumen.
3. **Cálculo de Impuestos y Total Final:**
   - $\text{Subtotal Base} = \sum (\text{precio\_unitario} \times \text{cantidad})$
   - $\text{Descuento Volumen} = \text{Subtotal Base} \times \%_{\text{volumen}}$
   - $\text{Subtotal Post-Volumen} = \text{Subtotal Base} - \text{Descuento Volumen}$
   - $\text{Descuento Institucional} = \text{Subtotal Post-Volumen} \times 8\%$
   - $\text{Descuento Total} = \text{Descuento Volumen} + \text{Descuento Institucional}$
   - $\text{Subtotal Neto} = \text{Subtotal Base} - \text{Descuento Total}$
   - $\text{Impuestos (IVA 12\%)} = \text{Subtotal Neto} \times 0.12$
   - $\text{Total Final} = \text{Subtotal Neto} + \text{Impuestos}$

---

## 6. Flujo de Ventas: Idempotencia y Limitador de Tiempo (10 Minutos)

Para evitar duplicidad en transacciones y garantizar una experiencia de compra consistente en alta concurrencia:

### Idempotencia con `IDEMPOTENCY_KEY` y Persistencia Dual
- Se firma criptográficamente un token mediante **HMAC-SHA256** utilizando la variable de entorno `process.env.IDEMPOTENCY_KEY`.
- Soporta llaves de hasta 255 caracteres (`VARCHAR(255)`) tanto en `ordenes.idempotency_key` como en `idempotencias.idempotency_key` y `checkout_sesiones.idempotency_key`.
- **Capa Dual de Replay:**
  1. **Memoria RAM:** Respuesta instantánea para peticiones concurrentes inmediatas.
  2. **Tabla `idempotencias` (PostgreSQL):** Persistencia relacional de respuestas completas en `cuerpo_respuesta (JSONB)`. Si el servidor se reinicia, el estado idempotente no se pierde.
- Cuando el cliente confirma la compra enviando el encabezado `Idempotency-Key` o el campo `idempotency_key`, el backend valida si la orden ya fue procesada. Si se repite, devuelve inmediatamente la respuesta con la cabecera HTTP `X-Idempotency-Replay: true`, **sin duplicar cobros ni descontar stock dos veces**.

### Sesiones de Checkout Persistidas y Limitador de Tiempo (10 Minutos)
- Al pasar al checkout (`POST /api/ordenes/iniciar-checkout`), se crea un registro en la tabla `checkout_sesiones` de PostgreSQL y se activa un temporizador de **10 minutos exactos** (600 segundos).
- Se genera un `token_sesion` único junto con los ítems calculados en formato `JSONB`, vinculando el usuario y la fecha exacta de expiración (`expira_en`).
- Durante este lapso, el cliente recibe ticks por WebSocket (`checkout:tick`) cada segundo o puede consultar el estado vía HTTP (`GET /api/ordenes/checkout-sesion`).
- Si transcurren más de 10 minutos sin confirmar la compra:
  - El backend actualiza la sesión a `estado = 'expirada'` en base de datos.
  - Emite el evento WebSocket `checkout:expirado`.
  - Responde con estado HTTP `410 Gone` y el payload `{ expiro: true, redirigir_tienda: true, ruta_redireccion: "/tienda" }`.
- Al confirmar la compra (`POST /api/ordenes/confirmar-checkout`), la sesión en base de datos pasa a `estado = 'completada'` y queda enlazada a la orden definitiva mediante `orden_id`.

---

## 7. Catálogo de Endpoints Principales de la API

### Autenticación (`/api/auth`)
- `POST /api/auth/register` : Registro de clientes minoristas e institucionales.
- `POST /api/auth/login` : Inicio de sesión y entrega de tokens JWT (Access y Refresh).
- `GET /api/auth/me` : Datos del usuario autenticado y perfil institucional asociado.
- `GET /api/auth/usuarios` *(Admin)* : Listado de usuarios del sistema.
- `PATCH /api/auth/institucionales/:id/verificar` *(Admin/Asesor)* : Aprobación o rechazo de clientes institucionales.

### Catálogo y Búsqueda (`/api/catalogo`)
- `GET /api/catalogo/landing` : Libros destacados, novedades del mes y banners promocionales.
- `GET /api/catalogo` : Buscador en tiempo real (`q`, `genero_id`, `formato_id`, `min_precio`, `max_precio`, `en_stock`, `orden`).
- `GET /api/catalogo/:id` : Ficha técnica del libro con sus variantes disponibles.
- `POST /api/catalogo` *(Admin)* : Crear producto en catálogo.
- `PATCH /api/catalogo/:id/stock` *(Admin)* : Ajustar stock disponible.
- `POST /api/catalogo/subir-portada` *(Admin)* : Subir archivo de imagen (Multer multipart/form-data) directamente a Cloudinary y obtener `url`.
- `POST /api/catalogo/libros` *(Admin)* : Crear libro (acepta `portada` como archivo físico o URL directa).
- `PUT /api/catalogo/libros/:id` *(Admin)* : Actualizar libro y su portada.
- `PATCH /api/catalogo/libros/:id/portada` *(Admin)* : Actualizar exclusivamente la portada del libro subiendo una nueva imagen a Cloudinary.

### Carrito de Compras (`/api/carrito`)
- `GET /api/carrito` : Obtener carrito con desglose dinámico calculado por el Modelo.
- `POST /api/carrito/items` : Agregar producto con validación de stock.
- `PUT /api/carrito/items/:itemId` : Modificar cantidad.
- `DELETE /api/carrito/items/:itemId` : Eliminar producto del carrito.
- `DELETE /api/carrito` : Vaciar carrito.

### Órdenes y Checkout (`/api/ordenes`)
- `POST /api/ordenes/iniciar-checkout` : Inicia sesión de 10 minutos (persistida en `checkout_sesiones`) y genera llave de idempotencia.
- `GET /api/ordenes/checkout-sesion` : Consulta el temporizador de 10 minutos y estado de la sesión en tiempo real.
- `POST /api/ordenes/cancelar-checkout` : Cancela la compra en BD y retorna a la tienda.
- `POST /api/ordenes/confirmar-checkout` : Cierre transaccional de orden con idempotencia, vinculación a `checkout_sesiones` y verificación de stock.
- `GET /api/ordenes/mis-ordenes` : Historial de pedidos del cliente autenticado.
- `GET /api/ordenes/:id` : Detalle completo de orden por ID (con desglose de reglas e ítems).
- `GET /api/ordenes` *(Admin/Asesor)* : Monitoreo de órdenes por estado (`Pendiente`, `Aprobado`, `Enviado`, `Cancelado`).
- `PATCH /api/ordenes/:id/estado` *(Admin/Asesor)* : Actualización de estado de entrega.

### Cotizaciones B2B (`/api/cotizaciones`)
- `POST /api/cotizaciones/solicitar` *(Institucional)* : Solicitud de cotización personalizada con variables de tiraje y acabado.
- `GET /api/cotizaciones/mis-solicitudes` *(Institucional)* : Historial de cotizaciones emitidas por el cliente institucional.
- `GET /api/cotizaciones/bandeja` *(Asesor/Admin)* : Bandeja comercial de cotizaciones pendientes.
- `PATCH /api/cotizaciones/solicitudes/:id/asignar` *(Asesor)* : Asignarse la solicitud comercial.
- `POST /api/cotizaciones/solicitudes/:id/propuesta` *(Asesor)* : Emisión de propuesta formal digital con costos y días de entrega.
- `POST /api/cotizaciones/solicitudes/:id/responder` *(Institucional)* : Aprobación o rechazo de la propuesta por parte del cliente.

### Reportería y Métricas Comerciales (`/api/reportes`)
- `GET /api/reportes/dashboard` *(Admin/Asesor)* : Dashboard integral de métricas en tiempo real (ingresos brutos, desglose de descuentos, impuestos IVA, total facturado neto, distribución de órdenes por estado, métricas de cotizaciones B2B, alertas de stock crítico y últimas órdenes).

---

## 8. Arquitectura y Eventos WebSockets en Tiempo Real (Socket.IO)

El servidor cuenta con un motor de eventos bidireccional en tiempo real para sincronizar tanto el estado del checkout como las métricas administrativas sin necesidad de sondeo (polling).

### Canales y Salas (Rooms)
1. **Sala de Checkout:** `checkout:${usuarioId}`  
   Se conecta el cliente al iniciar el proceso de compra.
2. **Sala de Reportería:** `reporteria`  
   Se conectan los paneles administrativos y comerciales de Asesores y Administradores.

### Eventos Emitidos por el Servidor
| Evento | Sala | Payload / Descripción |
|---|---|---|
| `checkout:tick` | `checkout:${id}` | `{ tiempo_restante_segundos, expira_en }` emitido cada segundo durante los 10 minutos. |
| `checkout:expirado` | `checkout:${id}` | `{ expiro: true, redirigir_tienda: true, ruta_redireccion: "/tienda" }` emitido al agotarse los 10 min. |
| `checkout:completado`| `checkout:${id}` | `{ completado: true, orden }` emitido tras confirmación exitosa de compra. |
| `checkout:cancelado` | `checkout:${id}` | `{ cancelado: true, redirigir_tienda: true }` emitido si el usuario cancela la sesión. |
| `reporte:actualizado`| `reporteria` | `{ data: metricas }` emitido en tiempo real ante cualquier nueva orden o cambio de estado. |
| `reporte:nueva_venta` | `reporteria` | `{ venta: { numero_orden, total_final, fecha } }` emitido al registrar una nueva transacción. |

---

## 9. Capa Vista (View): Interfaz por Rol

La Vista vive en `public/` y Express la sirve con `express.static`. Es HTML, CSS y JavaScript sin dependencias ni paso de compilación. Toda la comunicación con el sistema pasa por `public/js/core/api.js`, que llama a la API REST del Controlador con el JWT en el encabezado `Authorization`. La Vista **no accede a la base de datos ni calcula descuentos**: el carrito, el pago y los pedidos muestran exactamente la liquidación que devuelve el Modelo.

| Rol | Vistas disponibles |
| --- | --- |
| Visitante | Portada, catálogo con búsqueda en tiempo real, ficha técnica, registro e inicio de sesión |
| Cliente Minorista | Lo anterior, carrito, cierre de orden y Mis pedidos |
| Cliente Institucional | Lo anterior, solicitudes especiales y cotizaciones recibidas |
| Asesor de Ventas | Bandeja de cotizaciones, validación de instituciones y monitoreo de órdenes |
| Administrador | Resumen, gestión de catálogo (con subida de portadas a Cloudinary), usuarios, instituciones y órdenes |

**Características principales**
- **Diseño responsivo** con Flexbox y CSS Grid: navegación desplegable y tablas convertidas en fichas en teléfono; barra lateral fija y tablas completas en escritorio.
- **Validación en tiempo de entrada** en registro, cierre de orden, solicitudes especiales y formularios del panel.
- **Protección de rutas en la Vista:** cada página declara los roles que la pueden ver y muestra "Acceso denegado" a los demás. La autorización real la aplica el Controlador con `autorizarRoles`.
- **Seguridad:** todo el texto que llega del Controlador se inserta con `textContent`, nunca con `innerHTML` (XSS); el token viaja en el encabezado `Authorization` y no en cookies (CSRF).
- **Portadas en Cloudinary:** el panel de catálogo permite elegir o arrastrar una imagen, la valida en el navegador (JPG, PNG, WEBP o GIF de hasta 5 MB) y la envía como `multipart/form-data` a `/api/catalogo/subir-portada` o `/api/catalogo/libros/:id/portada`.

---

## 10. Plan de Pruebas (QA)

El plan completo está en [`docs/PLAN_DE_PRUEBAS.md`](docs/PLAN_DE_PRUEBAS.md): 48 casos automatizados de los flujos de los cinco roles, casos manuales de Cloudinary y de interacción, revisión responsiva en 390, 768 y 1440 px, y tiempos de carga (todas las vistas por debajo de 2 segundos).

Para correr las pruebas automatizadas con el servidor encendido y la base recién cargada:
```bash
npm install --no-save playwright
npx playwright install chromium
node pruebas/vista.e2e.mjs
```
