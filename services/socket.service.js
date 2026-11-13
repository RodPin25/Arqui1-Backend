import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

const ROLES_BANDEJA = new Set(["ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"]);
const ROLES_ADMIN = new Set(["ADMIN", "ADMINISTRADOR"]);
const esAsesorOAdmin = (rol) => ROLES_BANDEJA.has(String(rol || "").toUpperCase());
const esAdmin = (rol) => ROLES_ADMIN.has(String(rol || "").toUpperCase());

/**
 * Inicializa el servidor WebSocket adjunto al servidor HTTP
 * @param {import("http").Server} httpServer
 */
export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    },
    transports: ["websocket", "polling"],
  });

  // Middleware de autenticación opcional para WebSocket
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
      socket.handshake.query?.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        socket.usuario = decoded;
      } catch (err) {
        // Token inválido pero permitimos conexión pública (ej. visitantes)
        socket.usuario = null;
      }
    } else {
      socket.usuario = null;
    }
    next();
  });

  io.on("connection", (socket) => {
    const usuarioInfo = socket.usuario ? `Usuario ID ${socket.usuario.id} (${socket.usuario.rol})` : "Anónimo";
    console.log(`🔌 Cliente WebSocket conectado: ${socket.id} - ${usuarioInfo}`);

    // Si el usuario está autenticado, unirlo a su sala privada por defecto
    if (socket.usuario?.id) {
      socket.join(`usuario:${socket.usuario.id}`);
      socket.join(`checkout:${socket.usuario.id}`);
      if (esAsesorOAdmin(socket.usuario.rol)) {
        socket.join("cotizaciones:bandeja");
        socket.join("panel:comercial");
      }
      if (esAdmin(socket.usuario.rol)) {
        socket.join("panel:admin");
        socket.join("reporteria");
      }
    }

    // 1. Unirse a la sala de Checkout para recibir el temporizador de 10 min en vivo
    socket.on("join:checkout", (payload = {}) => {
      const usuarioId = payload.usuario_id || socket.usuario?.id;
      if (usuarioId) {
        const roomName = `checkout:${usuarioId}`;
        socket.join(roomName);
        socket.emit("checkout:conectado", {
          ok: true,
          mensaje: `Conectado a la sesión de checkout en tiempo real para usuario ${usuarioId}`,
          room: roomName,
        });
      }
    });

    // 2. Unirse a la sala de Reportería en vivo (para administradores y asesores)
    socket.on("join:reporteria", () => {
      socket.join("reporteria");
      socket.emit("reporteria:conectado", {
        ok: true,
        mensaje: "Conectado a la sala de Reportería y Métricas Comerciales en Vivo",
        timestamp: new Date().toISOString(),
      });
    });

    // 3. Unirse a la sala de cotizaciones en tiempo real
    socket.on("join:cotizaciones", () => {
      if (!socket.usuario?.id) return;
      socket.join(`usuario:${socket.usuario.id}`);
      if (esAsesorOAdmin(socket.usuario.rol)) {
        socket.join("cotizaciones:bandeja");
      }
      socket.emit("cotizaciones:conectado", {
        ok: true,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Cliente WebSocket desconectado: ${socket.id} (${reason})`);
    });
  });

  return io;
};

/**
 * Obtener la instancia activa de Socket.IO
 */
export const getIO = () => {
  return io;
};

// ============================================================================
// EMISORES DE EVENTOS EN TIEMPO REAL
// ============================================================================

/**
 * Emite el tick por segundo del temporizador de 10 minutos al usuario
 */
export const emitirTickCheckout = (usuarioId, payload) => {
  if (!io) return;
  io.to(`checkout:${usuarioId}`).emit("checkout:tick", {
    usuario_id: usuarioId,
    tiempo_restante_segundos: payload.tiempo_restante_segundos,
    expira_en: payload.expira_en,
    expiro: false,
    timestamp: Date.now(),
  });
};

/**
 * Emite la expiración de la sesión de checkout (tras los 10 minutos)
 */
export const emitirExpiracionCheckout = (usuarioId, payload = {}) => {
  if (!io) return;
  io.to(`checkout:${usuarioId}`).emit("checkout:expirado", {
    usuario_id: usuarioId,
    expiro: true,
    redirigir_tienda: true,
    ruta_redireccion: "/tienda",
    mensaje: payload.mensaje || "El periodo de 10 minutos ha expirado. Regresando automáticamente a la tienda.",
    timestamp: Date.now(),
  });
};

/**
 * Emite la confirmación de la compra en la sesión de checkout
 */
export const emitirCheckoutCompletado = (usuarioId, ordenData) => {
  if (!io) return;
  io.to(`checkout:${usuarioId}`).emit("checkout:completado", {
    usuario_id: usuarioId,
    completado: true,
    orden: ordenData,
    timestamp: Date.now(),
  });
};

/**
 * Emite la cancelación voluntaria del checkout
 */
export const emitirCheckoutCancelado = (usuarioId) => {
  if (!io) return;
  io.to(`checkout:${usuarioId}`).emit("checkout:cancelado", {
    usuario_id: usuarioId,
    cancelado: true,
    redirigir_tienda: true,
    ruta_redireccion: "/tienda",
    timestamp: Date.now(),
  });
};

/**
 * Emite actualización de reportería y métricas a todos los administradores en vivo
 */
export const emitirActualizacionReporteria = (metricas) => {
  if (!io) return;
  io.to("reporteria").emit("reporte:actualizado", {
    ok: true,
    timestamp: new Date().toISOString(),
    data: metricas,
  });
};

/**
 * Emite evento de nueva venta en tiempo real para panel de control
 */
export const emitirNuevaVenta = (nuevaVenta) => {
  if (!io) return;
  io.to("reporteria").emit("reporte:nueva_venta", {
    ok: true,
    timestamp: new Date().toISOString(),
    venta: nuevaVenta,
  });
};

/**
 * Emite una nueva solicitud de cotización a la bandeja de asesores/admins y al cliente dueño
 */
export const emitirNuevaSolicitudCotizacion = (solicitud) => {
  if (!io || !solicitud) return;
  const payload = {
    ok: true,
    tipo: "nueva",
    solicitud,
    timestamp: Date.now(),
  };
  io.to("cotizaciones:bandeja").emit("cotizacion:nueva", payload);
  if (solicitud.cliente_id) {
    io.to(`usuario:${solicitud.cliente_id}`).emit("cotizacion:nueva", payload);
  }
};

/**
 * Emite actualización de una solicitud de cotización a la bandeja y al cliente dueño
 */
export const emitirActualizacionCotizacion = (solicitud, tipo = "actualizada") => {
  if (!io || !solicitud) return;
  const payload = {
    ok: true,
    tipo,
    solicitud,
    timestamp: Date.now(),
  };
  io.to("cotizaciones:bandeja").emit("cotizacion:actualizada", payload);
  if (solicitud.cliente_id) {
    io.to(`usuario:${solicitud.cliente_id}`).emit("cotizacion:actualizada", payload);
  }
};

/**
 * Emite una nueva orden al panel comercial y al cliente dueño
 */
export const emitirNuevaOrden = (orden) => {
  if (!io || !orden) return;
  const payload = { ok: true, orden, timestamp: Date.now() };
  io.to("panel:comercial").emit("orden:nueva", payload);
  if (orden.usuario_id) {
    io.to(`usuario:${orden.usuario_id}`).emit("orden:nueva", payload);
  }
};

/**
 * Emite actualización de estado de una orden al panel comercial y al cliente dueño
 */
export const emitirActualizacionOrden = (orden) => {
  if (!io || !orden) return;
  const payload = { ok: true, orden, timestamp: Date.now() };
  io.to("panel:comercial").emit("orden:actualizada", payload);
  if (orden.usuario_id) {
    io.to(`usuario:${orden.usuario_id}`).emit("orden:actualizada", payload);
  }
};

/**
 * Emite creación o validación de un perfil institucional
 */
export const emitirInstitucion = (perfil, evento = "institucion:actualizada") => {
  if (!io || !perfil) return;
  const payload = { ok: true, perfil, timestamp: Date.now() };
  io.to("panel:comercial").emit(evento, payload);
  if (perfil.usuario_id) {
    io.to(`usuario:${perfil.usuario_id}`).emit(evento, payload);
  }
};

/**
 * Emite creación o actualización de usuario al panel de administración (y al propio usuario)
 */
export const emitirUsuario = (usuario, evento = "usuario:actualizado") => {
  if (!io || !usuario) return;
  const payload = { ok: true, usuario, timestamp: Date.now() };
  io.to("panel:admin").emit(evento, payload);
  if (usuario.id && evento === "usuario:actualizado") {
    io.to(`usuario:${usuario.id}`).emit(evento, payload);
  }
};

/**
 * Emite cambios en el catálogo o inventario a todos los clientes conectados
 */
export const emitirCatalogoActualizado = (detalle = {}) => {
  if (!io) return;
  io.emit("catalogo:actualizado", { ok: true, ...detalle, timestamp: Date.now() });
};

/**
 * Emite cambios en el carrito a las pestañas activas del usuario
 */
export const emitirCarritoActualizado = (usuarioId, detalle = {}) => {
  if (!io || !usuarioId) return;
  io.to(`usuario:${usuarioId}`).emit("carrito:actualizado", {
    ok: true,
    usuario_id: usuarioId,
    ...detalle,
    timestamp: Date.now(),
  });
};
