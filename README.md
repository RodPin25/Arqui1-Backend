# Plataforma Web Editorial Multicanal (Arquitectura MVC)

> **Proyecto Final - Hackathon de Arquitectura de Sistemas**  
> Implementación rigurosa del patrón arquitectónico **Modelo-Vista-Controlador (MVC)** con Node.js, Express, Sequelize ORM y PostgreSQL.

---

## 1. Diagrama de Arquitectura de Sistemas

El sistema implementa una estricta separación de responsabilidades bajo el patrón **Modelo-Vista-Controlador (MVC)**, garantizando desacoplamiento efectivo entre la capa de presentación, la orquestación HTTP y las reglas de negocio de dominio.

```
                           +-----------------------------------------------+
                           |                 CLIENTE / UI                  |
                           |   (Navegador Web / Dispositivos Móviles / API)|
                           +-----------------------+-----------------------+
                                                   |
                                         HTTP / JSON / REST
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
|                              Esquema normalizado con 18 tablas                                    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Estructura de Carpetas MVC

```text
Backend/
├── config/
│   ├── db.js                   # Configuración del pool de conexiones Sequelize a PostgreSQL
│   └── initDb.js               # Aseguramiento de roles iniciales del sistema
├── controllers/
│   ├── auth.controller.js      # Controlador de autenticación, perfiles y usuarios
│   ├── carrito.controller.js   # Controlador del carrito de compras
│   ├── catalogo.controller.js  # Controlador del catálogo bibliográfico y metadatos
│   ├── cotizacion.controller.js# Controlador de solicitudes y propuestas comerciales B2B
│   └── orden.controller.js     # Controlador de órdenes, idempotencia y temporizador de 10 min
├── middlewares/
│   └── auth.middleware.js      # Interceptores para JWT y autorización por roles (RBAC)
├── models/
│   ├── Autores.js              # Entidad de autores
│   ├── Carrito_Items.js        # Ítems en el carrito de compras
│   ├── Carritos.js             # Carrito + MOTOR DE DESCUENTOS EN EL MODELO
│   ├── Catalogo_Productos.js   # Variantes por formato, stock y precio base
│   ├── Cotizacion_Propuesta.js # Propuestas formales de cotización emitidas por asesores
│   ├── Cotizacion_Solicitud.js # Solicitudes de pedidos especiales de clientes institucionales
│   ├── Editoriales.js          # Entidad de casas editoriales
│   ├── Formatos.js             # Formatos (Físico Tapa Blanda, Tapa Dura, E-Book, Audio)
│   ├── Generos.js              # Géneros literarios
│   ├── index.js                # Asociación de relaciones ORM y exportación centralizada
│   ├── Libros.js               # Entidad principal de obras literarias
│   ├── Libros_Autores.js       # Tabla asociativa N:M libros-autores
│   ├── Libros_Editoriales.js   # Tabla asociativa N:M libros-editoriales
│   ├── Libros_Generos.js       # Tabla asociativa N:M libros-géneros
│   ├── Orden.js                # Encabezado de orden de compra + liquidación de modelo
│   ├── Orden_Detalle.js        # Líneas de venta con precio histórico y subtotal
│   ├── Perfiles_Institucionales.js # Datos corporativos de clientes mayoristas
│   ├── Rol.js                  # Catálogo de roles del sistema
│   └── Usuario.js              # Cuentas de usuario con hash seguro de contraseñas
├── routes/
│   ├── auth.routes.js          # Rutas de autenticación y gestión de usuarios
│   ├── carrito.routes.js       # Rutas del carrito de compras
│   ├── catalogo.routes.js      # Rutas de productos, filtros y metadatos
│   ├── cotizacion.routes.js    # Rutas de cotizaciones comerciales
│   └── orden.routes.js         # Rutas de órdenes, inicio de checkout y confirmación
├── scripts/
│   └── seed.js                 # Semilla con 12 libros y los 5 roles de usuario
├── utils/
│   └── idempotencia.js         # Motor criptográfico de idempotencia (HMAC-SHA256)
├── .env                        # Variables de entorno locales
├── .env.example                # Plantilla de variables de entorno
├── app.js                      # Configuración de Express y montaje de rutas modulares
├── database.sql                # Entregable DDL + DML exportado para evaluación
├── package.json                # Dependencias y scripts de ejecución
├── REQUIREMENTS.md             # Guía oficial de requerimientos de la hackathon
└── server.js                   # Punto de entrada y arranque del servidor HTTP
```

---

## 3. Guía de Instalación y Ejecución Paso a Paso

### Requisitos Previos
- **Node.js**: v18.0.0 o superior (recomendado v20+).
- **PostgreSQL**: v13 o superior.
- **Git** instalado.

### Paso 1: Clonar el Repositorio y Ubicarse en el Proyecto
```bash
git clone <URL_DEL_REPOSITORIO>
cd Backend
```

### Paso 2: Instalar Dependencias
```bash
npm install
```

### Paso 3: Configurar Variables de Entorno (`.env`)
Crear un archivo `.env` en la raíz de `Backend/` basándose en `.env.example`:
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
IDEMPOTENCY_KEY="QYCeYwdMlWq1Wf32NmfAxJgmh+U2AdkwMUfYcLNzw8rZHDs52GxYIw2keSVWJZR4VczwRLJz7WcP1CMJ06ovuw=="
```

### Paso 4: Poblar la Base de Datos con la Data Semilla
Ejecutar el script de inicialización para crear las tablas relacionales y registrar los usuarios de prueba, formatos, géneros, editoriales y 12 libros completos:
```bash
npm run seed
```

*(Opcional)* Si se desea restaurar directamente desde el archivo SQL exportado:
```bash
psql -U postgres -d Arqui1 -f database.sql
```

### Paso 5: Levantar el Servidor
```bash
# Modo desarrollo con recarga automática:
npm run dev

# Modo producción:
npm start
```

El servidor estará escuchando en: `http://localhost:3000`  
Verificación de salud: `http://localhost:3000/api/health`

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

Para evitar duplicidad en transacciones y garantizar una experiencia de compra consistente:

### Idempotencia con `IDEMPOTENCY_KEY`
- Se firma criptográficamente un token mediante **HMAC-SHA256** utilizando la variable de entorno `process.env.IDEMPOTENCY_KEY`.
- Cuando el cliente confirma la compra enviando el encabezado `Idempotency-Key` o el campo `idempotency_key`, el backend valida si la orden ya fue procesada.
- Si la petición se repite (doble clic o reintento de red), el backend devuelve inmediatamente la orden existente con la cabecera HTTP `X-Idempotency-Replay: true`, **sin duplicar la orden ni descontar stock dos veces**.

### Limitador de Tiempo de 10 Minutos
- Al pasar al checkout (`POST /api/ordenes/iniciar-checkout`), se activa un temporizador de **10 minutos exactos** (600 segundos).
- Durante este lapso, el cliente puede consultar en tiempo real el tiempo restante (`GET /api/ordenes/checkout-sesion`).
- Si transcurren más de 10 minutos sin confirmar la compra:
  - El backend invalida automáticamente la sesión devolviendo estado `410 Gone`.
  - Se retorna el indicador `{ expiro: true, redirigir_tienda: true, ruta_redireccion: "/tienda" }`.
  - El sistema devuelve al usuario automáticamente a la tienda para reiniciar el proceso.

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

### Carrito de Compras (`/api/carrito`)
- `GET /api/carrito` : Obtener carrito con desglose dinámico calculado por el Modelo.
- `POST /api/carrito/items` : Agregar producto con validación de stock.
- `PUT /api/carrito/items/:itemId` : Modificar cantidad.
- `DELETE /api/carrito/items/:itemId` : Eliminar producto del carrito.
- `DELETE /api/carrito` : Vaciar carrito.

### Órdenes y Checkout (`/api/ordenes`)
- `POST /api/ordenes/iniciar-checkout` : Inicia sesión de 10 minutos y genera llave de idempotencia.
- `GET /api/ordenes/checkout-sesion` : Consulta el temporizador de 10 minutos en tiempo real.
- `POST /api/ordenes/cancelar-checkout` : Cancela la compra y retorna a la tienda.
- `POST /api/ordenes/confirmar-checkout` : Cierre transaccional de orden con idempotencia y verificación de stock.
- `GET /api/ordenes/mis-ordenes` : Historial de pedidos del cliente autenticado.
- `GET /api/ordenes` *(Admin/Asesor)* : Monitoreo de órdenes por estado (`Pendiente`, `Aprobado`, `Enviado`, `Cancelado`).
- `PATCH /api/ordenes/:id/estado` *(Admin/Asesor)* : Actualización de estado de entrega.

### Cotizaciones B2B (`/api/cotizaciones`)
- `POST /api/cotizaciones/solicitar` *(Institucional)* : Solicitud de cotización personalizada con variables de tiraje y acabado.
- `GET /api/cotizaciones/mis-solicitudes` *(Institucional)* : Seguimiento de cotizaciones del cliente.
- `GET /api/cotizaciones/bandeja` *(Asesor/Admin)* : Bandeja comercial de cotizaciones pendientes.
- `PATCH /api/cotizaciones/solicitudes/:id/asignar` *(Asesor)* : Asignarse la solicitud comercial.
- `POST /api/cotizaciones/solicitudes/:id/propuesta` *(Asesor)* : Emisión de propuesta formal digital con costos y días de entrega.
- `POST /api/cotizaciones/solicitudes/:id/responder` *(Institucional)* : Aprobación o rechazo de la propuesta por parte del cliente.
