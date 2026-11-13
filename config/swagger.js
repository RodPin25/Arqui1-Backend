export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Plataforma Editorial MVC - API Documentation",
    version: "1.0.0",
    description: `
Documentación técnica interactiva de la **Plataforma Web Editorial Multicanal** (Hackathon de Arquitectura de Sistemas).

### Características Clave Implementadas:
- **Arquitectura MVC desacoplada:** Lógica de cálculo en el Modelo, orquestación en el Controlador y persistencia con Sequelize.
- **Motor de Descuentos en el Modelo (RF-03.2):** Volumen (0%, 5%, 10%, 15%) y acumulable institucional (+8%).
- **Gestión de 5 Roles (RBAC):** Visitante, Cliente Minorista, Cliente Institucional, Asesor y Administrador.
- **Flujo de Ventas Seguro:** Control de **Idempotencia** (firmas HMAC-SHA256 con IDEMPOTENCY_KEY) y **Limitador de Tiempo de 10 Minutos** con WebSockets y redirección automática.
- **Almacenamiento Multimedia:** Integración con **Cloudinary** y **Multer** para portadas de libros.
- **WebSockets en Tiempo Real:** Temporizador de checkout y dashboard de reportería comercial en vivo.
    `,
    contact: {
      name: "Soporte Técnico Editorial",
      email: "soporte@editorial.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Servidor Local de Desarrollo (Puerto 3000)",
    },
    {
      url: "http://localhost:3001",
      description: "Servidor Alternativo (Puerto 3001)",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Introduce el token JWT obtenido tras iniciar sesión en `/api/auth/login`",
      },
      idempotencyHeader: {
        type: "apiKey",
        in: "header",
        name: "Idempotency-Key",
        description: "Llave de idempotencia para compras (opcional en cabecera o cuerpo)",
      },
    },
  },
  tags: [
    { name: "Salud y Sistema", description: "Verificación de conexión con PostgreSQL y estado del servidor" },
    { name: "Autenticación y Usuarios", description: "Login, registro minorista/institucional y administración RBAC" },
    { name: "Catálogo y Libros", description: "Búsqueda en tiempo real, fichas técnicas, subida a Cloudinary y CRUD" },
    { name: "Carrito de Compras", description: "Gestión de ítems y liquidación dinámica del Modelo" },
    { name: "Órdenes y Checkout", description: "Proceso de compra, temporizador de 10 min, idempotencia y monitoreo" },
    { name: "Cotizaciones B2B", description: "Solicitudes institucionales y emisión de propuestas por asesores" },
    { name: "Reportería en Tiempo Real", description: "Métricas financieras, ticket promedio y alertas de inventario" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Salud y Sistema"],
        summary: "Verificar salud del servidor y conexión a PostgreSQL",
        responses: {
          200: { description: "Servidor y base de datos conectados correctamente" },
          500: { description: "Fallo de conexión con la base de datos" },
        },
      },
    },

    // -------------------------------------------------------------
    // AUTENTICACIÓN
    // -------------------------------------------------------------
    "/api/auth/register": {
      post: {
        tags: ["Autenticación y Usuarios"],
        summary: "Registro de nuevo usuario (Minorista o Institucional)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "nombres", "apellidos"],
                properties: {
                  email: { type: "string", example: "nuevo@cliente.com" },
                  password: { type: "string", example: "Password123!" },
                  nombres: { type: "string", example: "Laura" },
                  apellidos: { type: "string", example: "Morales" },
                  telefono: { type: "string", example: "+502 5555-1234" },
                  rol: {
                    type: "string",
                    enum: ["CLIENTE_MINORISTA", "CLIENTE_INSTITUCIONAL"],
                    default: "CLIENTE_MINORISTA",
                  },
                  razon_social: { type: "string", description: "Solo para institucional" },
                  documento_tributario: { type: "string", description: "NIT / RUT institucional" },
                  direccion_fiscal: { type: "string", description: "Dirección fiscal institucional" },
                  contacto_cargo: { type: "string", description: "Cargo del representante" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Usuario registrado exitosamente" },
          400: { description: "Faltan datos obligatorios o formato inválido" },
          409: { description: "Correo electrónico ya registrado" },
        },
      },
    },

    "/api/auth/login": {
      post: {
        tags: ["Autenticación y Usuarios"],
        summary: "Iniciar sesión (Obtener JWT Access y Refresh Token)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "minorista@editorial.com" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Inicio de sesión exitoso, retorna tokens JWT" },
          401: { description: "Credenciales inválidas" },
        },
      },
    },

    "/api/auth/me": {
      get: {
        tags: ["Autenticación y Usuarios"],
        summary: "Obtener perfil del usuario autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Datos del usuario, rol y perfil institucional" },
          401: { description: "No autenticado" },
        },
      },
    },

    "/api/auth/institucionales": {
      get: {
        tags: ["Autenticación y Usuarios"],
        summary: "Listar perfiles institucionales (Admin / Asesor)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "estado", in: "query", schema: { type: "string", enum: ["pendiente", "verificado", "rechazado"] } },
        ],
        responses: {
          200: { description: "Lista de perfiles corporativos" },
          403: { description: "Acceso denegado" },
        },
      },
    },

    "/api/auth/institucionales/{usuario_id}/verificar": {
      patch: {
        tags: ["Autenticación y Usuarios"],
        summary: "Aprobar o rechazar cliente institucional (Admin / Asesor)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "usuario_id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["estado_verificacion"],
                properties: {
                  estado_verificacion: { type: "string", enum: ["verificado", "rechazado", "pendiente"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Estado institucional actualizado" },
          404: { description: "Perfil no encontrado" },
        },
      },
    },

    // -------------------------------------------------------------
    // CATÁLOGO Y LIBROS
    // -------------------------------------------------------------
    "/api/catalogo/landing": {
      get: {
        tags: ["Catálogo y Libros"],
        summary: "Datos de portada: Publicaciones destacadas, novedades del mes y banners promocionales (RF-01.1)",
        responses: {
          200: { description: "Estructura de la landing page con colecciones" },
        },
      },
    },

    "/api/catalogo": {
      get: {
        tags: ["Catálogo y Libros"],
        summary: "Buscador en tiempo real y catálogo bibliográfico con filtros combinables (RF-01.2)",
        parameters: [
          { name: "q", in: "query", description: "Búsqueda textual por título, sinopsis o ISBN", schema: { type: "string" } },
          { name: "genero_id", in: "query", schema: { type: "integer" } },
          { name: "formato_id", in: "query", schema: { type: "integer" } },
          { name: "min_precio", in: "query", schema: { type: "number" } },
          { name: "max_precio", in: "query", schema: { type: "number" } },
          { name: "en_stock", in: "query", schema: { type: "boolean" } },
          { name: "orden", in: "query", schema: { type: "string", enum: ["recientes", "precio_asc", "precio_desc", "alfabetico"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 12 } },
        ],
        responses: {
          200: { description: "Listado paginado de productos en catálogo" },
        },
      },
    },

    "/api/catalogo/{id}": {
      get: {
        tags: ["Catálogo y Libros"],
        summary: "Ficha técnica completa de un libro y sus variantes (RF-01.3)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Ficha técnica bibliográfica con formatos y stock" },
          404: { description: "Producto no encontrado" },
        },
      },
    },

    "/api/catalogo/subir-portada": {
      post: {
        tags: ["Catálogo y Libros"],
        summary: "Subir imagen de portada a Cloudinary mediante Multer (Admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  portada: {
                    type: "string",
                    format: "binary",
                    description: "Archivo de imagen (JPEG, PNG, WEBP, GIF, máx 5MB)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Imagen subida exitosamente a Cloudinary con secure_url" },
          400: { description: "Archivo faltante o formato no válido" },
        },
      },
    },

    "/api/catalogo/libros": {
      post: {
        tags: ["Catálogo y Libros"],
        summary: "Crear un nuevo libro con soporte de portada en Cloudinary (Admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["titulo"],
                properties: {
                  titulo: { type: "string", example: "Arquitectura Limpia" },
                  sinopsis: { type: "string" },
                  anio_edicion: { type: "integer", example: 2024 },
                  editorial_id: { type: "integer" },
                  autores_ids: { type: "string", description: "JSON Array de IDs, ej: [1, 2]" },
                  generos_ids: { type: "string", description: "JSON Array de IDs, ej: [3]" },
                  portada: { type: "string", format: "binary", description: "Archivo de imagen opcional para Cloudinary" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Libro creado exitosamente" },
        },
      },
    },

    "/api/catalogo/libros/{id}/portada": {
      patch: {
        tags: ["Catálogo y Libros"],
        summary: "Actualizar exclusivamente la portada de un libro en Cloudinary (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["portada"],
                properties: {
                  portada: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Portada actualizada exitosamente" },
        },
      },
    },

    "/api/catalogo/{id}/stock": {
      patch: {
        tags: ["Catálogo y Libros"],
        summary: "Ajustar stock disponible de un producto (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["stock_disponible"],
                properties: {
                  stock_disponible: { type: "integer", example: 50 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Stock actualizado" },
        },
      },
    },

    // -------------------------------------------------------------
    // CARRITO DE COMPRAS
    // -------------------------------------------------------------
    "/api/carrito": {
      get: {
        tags: ["Carrito de Compras"],
        summary: "Obtener carrito del usuario con cálculo dinámico del Modelo (RF-03.1 y RF-03.2)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Ítems del carrito y desglose exacto de reglas de descuento (volumen e institucional)",
          },
        },
      },
      delete: {
        tags: ["Carrito de Compras"],
        summary: "Vaciar carrito por completo",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Carrito vaciado" },
        },
      },
    },

    "/api/carrito/items": {
      post: {
        tags: ["Carrito de Compras"],
        summary: "Agregar producto al carrito",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["producto_id"],
                properties: {
                  producto_id: { type: "integer", example: 1 },
                  cantidad: { type: "integer", example: 2 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Producto añadido al carrito" },
          400: { description: "Stock insuficiente o cantidad inválida" },
        },
      },
    },

    // -------------------------------------------------------------
    // ÓRDENES Y CHECKOUT (TEMPORIZADOR + IDEMPOTENCIA)
    // -------------------------------------------------------------
    "/api/ordenes/iniciar-checkout": {
      post: {
        tags: ["Órdenes y Checkout"],
        summary: "Iniciar proceso de Checkout (Activa el temporizador de 10 minutos y genera Idempotency Key)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Sesión de checkout creada con cuenta regresiva de 600s y emisión WebSocket en vivo",
          },
        },
      },
    },

    "/api/ordenes/checkout-sesion": {
      get: {
        tags: ["Órdenes y Checkout"],
        summary: "Consultar temporizador de los 10 minutos en tiempo real",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Segundos restantes antes de expirar o indicador de expiración",
          },
        },
      },
    },

    "/api/ordenes/confirmar-checkout": {
      post: {
        tags: ["Órdenes y Checkout"],
        summary: "Confirmar compra con Idempotencia y control de los 10 minutos (RF-03.3)",
        security: [{ bearerAuth: [] }, { idempotencyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["direccion_entrega"],
                properties: {
                  direccion_entrega: { type: "string", example: "Avenida Las Américas 14-20, Zona 10" },
                  idempotency_key: { type: "string", description: "Llave de idempotencia generada al iniciar checkout" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Orden creada exitosamente" },
          200: { description: "Petición idempotente: Respuesta de orden ya existente sin duplicar transacciones" },
          410: { description: "Tiempo de 10 minutos expirado. Redirige a la tienda" },
        },
      },
    },

    "/api/ordenes/cancelar-checkout": {
      post: {
        tags: ["Órdenes y Checkout"],
        summary: "Cancelar el checkout y regresar voluntariamente a la tienda",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Checkout cancelado" },
        },
      },
    },

    "/api/ordenes/mis-ordenes": {
      get: {
        tags: ["Órdenes y Checkout"],
        summary: "Historial de pedidos del cliente autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Historial completo de órdenes con detalles y estados" },
        },
      },
    },

    "/api/ordenes": {
      get: {
        tags: ["Órdenes y Checkout"],
        summary: "Monitoreo administrativo de órdenes (Admin / Asesor - RF-05.2)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "estado", in: "query", schema: { type: "string", enum: ["Pendiente", "Aprobado", "Enviado", "Cancelado"] } },
        ],
        responses: {
          200: { description: "Listado de todas las órdenes del sistema" },
        },
      },
    },

    "/api/ordenes/{id}/estado": {
      patch: {
        tags: ["Órdenes y Checkout"],
        summary: "Actualizar estado de una orden (Admin / Asesor)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["estado"],
                properties: {
                  estado: { type: "string", enum: ["Pendiente", "Aprobado", "Enviado", "Cancelado"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Estado de orden actualizado y emitido por WebSockets a reportería" },
        },
      },
    },

    "/api/ordenes/{id}": {
      get: {
        tags: ["Órdenes y Checkout"],
        summary: "Detalle completo de una orden por ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Detalle de orden con ítems, desglose de reglas y datos de entrega" },
          404: { description: "Orden no encontrada" },
        },
      },
    },

    // -------------------------------------------------------------
    // COTIZACIONES B2B
    // -------------------------------------------------------------
    "/api/cotizaciones/solicitar": {
      post: {
        tags: ["Cotizaciones B2B"],
        summary: "Solicitar cotización personalizada para Clientes Institucionales (RF-04.1 y RF-04.2)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["titulo_obra", "cantidad_estimada", "acabado_portada", "tipo_papel", "fecha_entrega_requerida"],
                properties: {
                  titulo_obra: { type: "string", example: "Antología Universitaria 2026" },
                  cantidad_estimada: { type: "integer", example: 500 },
                  acabado_portada: { type: "string", example: "Tapa Dura con Barniz UV Sectorizado" },
                  tipo_papel: { type: "string", example: "Papel Bond 90g Ahuesado" },
                  fecha_entrega_requerida: { type: "string", format: "date", example: "2026-12-15" },
                  notas_cliente: { type: "string", example: "Requerimos embalaje por cajas de 25 unidades." },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Solicitud de cotización creada" },
        },
      },
    },

    "/api/cotizaciones/mis-solicitudes": {
      get: {
        tags: ["Cotizaciones B2B"],
        summary: "Historial de solicitudes de cotización del cliente institucional autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Listado de solicitudes con sus propuestas asociadas" },
        },
      },
    },

    "/api/cotizaciones/bandeja": {
      get: {
        tags: ["Cotizaciones B2B"],
        summary: "Bandeja comercial de cotizaciones pendientes (Asesor / Admin - RF-05.3)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Solicitudes de cotización para revisión comercial" },
        },
      },
    },

    "/api/cotizaciones/solicitudes/{id}/asignar": {
      patch: {
        tags: ["Cotizaciones B2B"],
        summary: "Asignar solicitud de cotización al asesor autenticado (Asesor / Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Solicitud asignada exitosamente" },
        },
      },
    },

    "/api/cotizaciones/solicitudes/{id}/propuesta": {
      post: {
        tags: ["Cotizaciones B2B"],
        summary: "Emitir propuesta formal digital con costos y validez (Asesor / Admin - RF-04.3)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["costo_unitario_ofrecido", "costo_total_propuesto", "tiempo_entrega_dias", "fecha_validez"],
                properties: {
                  costo_unitario_ofrecido: { type: "number", example: 12.50 },
                  costo_total_propuesto: { type: "number", example: 6250.00 },
                  tiempo_entrega_dias: { type: "integer", example: 14 },
                  condiciones_comerciales: { type: "string", example: "Anticipo del 50% y saldo contra entrega." },
                  fecha_validez: { type: "string", format: "date", example: "2026-12-01" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Propuesta formal emitida para aprobación del cliente" },
        },
      },
    },

    "/api/cotizaciones/solicitudes/{id}/responder": {
      post: {
        tags: ["Cotizaciones B2B"],
        summary: "Cliente institucional aprueba o rechaza la propuesta formal (RF-04.3)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["accion"],
                properties: {
                  accion: { type: "string", enum: ["aprobar", "rechazar"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Respuesta registrada" },
        },
      },
    },

    // -------------------------------------------------------------
    // REPORTERÍA Y MÉTRICAS EN VIVO
    // -------------------------------------------------------------
    "/api/reportes/dashboard": {
      get: {
        tags: ["Reportería en Tiempo Real"],
        summary: "Dashboard financiero y comercial integral (Admin / Asesor - RF-05)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Métricas de ventas, desglose de reglas de descuento, impuestos, cotizaciones y alertas de stock",
          },
        },
      },
    },
  },
};
