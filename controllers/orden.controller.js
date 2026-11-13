import { randomUUID } from "crypto";
import {
  sequelize,
  Orden,
  OrdenDetalle,
  Carritos,
  CarritoItem,
  Catalogo_Productos,
  Libros,
  Formatos,
  Usuario,
  Rol,
  CheckoutSesion,
} from "../models/index.js";
import {
  generarIdempotencyKey,
  validarFormatoIdempotencyKey,
  obtenerRegistroIdempotente,
  guardarRegistroIdempotente,
} from "../utils/idempotencia.js";
import {
  emitirTickCheckout,
  emitirExpiracionCheckout,
  emitirCheckoutCompletado,
  emitirCheckoutCancelado,
  emitirNuevaVenta,
  emitirNuevaOrden,
  emitirActualizacionOrden,
  emitirCatalogoActualizado,
  emitirCarritoActualizado,
} from "../services/socket.service.js";
import { refrescarReporteriaEnVivo } from "./reportes.controller.js";

// Duración estricta de la sesión de checkout: 10 minutos (600,000 milisegundos)
const DURACION_CHECKOUT_MS = 10 * 60 * 1000;

// Almacén en memoria de sesiones de checkout activas por usuario
const sesionesCheckoutActivas = new Map();

// Almacén de intervalos de emisión en vivo por WebSocket para cada sesión activa
const temporizadoresCheckout = new Map();

/**
 * Generador de número de orden único legible (ej. ORD-20261112-AB12)
 */
const generarNumeroOrden = () => {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${hoy}-${randomStr}`;
};

/**
 * RF-03 / REQUERIMIENTO ESPECIAL: Iniciar proceso de Checkout con temporizador de 10 minutos
 * en tiempo real (vía WebSockets) e Idempotency Key generada a partir de IDEMPOTENCY_KEY.
 */
export const iniciarCheckout = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const rolNombre = req.usuario.rol;

    // 1. Obtener carrito del usuario
    const carrito = await Carritos.findOne({
      where: { usuario_id: usuarioId },
      include: [
        {
          model: CarritoItem,
          as: "items",
          include: [
            {
              model: Catalogo_Productos,
              as: "producto",
              include: [
                { model: Formatos, as: "formato", attributes: ["id", "codigo", "nombre"] },
                { model: Libros, as: "libro", attributes: ["id", "titulo", "portada_url"] },
              ],
            },
          ],
        },
      ],
    });

    if (!carrito || !carrito.items || carrito.items.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "El carrito de compras está vacío. Agregue libros antes de pasar al checkout.",
      });
    }

    // 2. Validar stock preliminar de cada ítem
    for (const item of carrito.items) {
      if (!item.producto || !item.producto.activo) {
        return res.status(400).json({
          ok: false,
          mensaje: "Un producto en su carrito ya no está disponible en catálogo.",
        });
      }
      if (item.producto.stock_disponible < item.cantidad) {
        return res.status(400).json({
          ok: false,
          mensaje: `Stock insuficiente para '${item.producto.libro?.titulo || item.producto.isbn}'. Disponible: ${item.producto.stock_disponible}, solicitado: ${item.cantidad}`,
        });
      }
    }

    // 3. Calcular desglose con la lógica de negocio en el Modelo
    const itemsParaCalculo = carrito.items.map((it) => ({
      cantidad: it.cantidad,
      precio_unitario: parseFloat(it.producto.precio_base),
    }));

    const liquidacion = Orden.calcularTotales({
      items: itemsParaCalculo,
      rolNombre,
    });

    // 4. Generar Idempotency Key basada en IDEMPOTENCY_KEY de las variables de entorno
    const ahora = Date.now();
    const expiraEn = new Date(ahora + DURACION_CHECKOUT_MS);
    const idempotencyKey = generarIdempotencyKey(usuarioId, carrito.id, ahora);
    const tokenSesion = `cs_${randomUUID().replace(/-/g, "")}`;

    // Desactivar cualquier sesión iniciada previa del usuario en base de datos
    await CheckoutSesion.update(
      { estado: "cancelada" },
      { where: { usuario_id: usuarioId, estado: "iniciada" } }
    );

    const totalUnidades = itemsParaCalculo.reduce((acc, it) => acc + it.cantidad, 0);
    const detallesItems = carrito.items.map((it) => ({
      producto_id: it.producto_id,
      isbn: it.producto?.isbn,
      titulo: it.producto?.libro?.titulo,
      cantidad: it.cantidad,
      precio_unitario: parseFloat(it.producto?.precio_base || 0),
      subtotal: +(parseFloat(it.producto?.precio_base || 0) * it.cantidad).toFixed(2),
    }));

    const descuentoTotal = +(
      parseFloat(liquidacion.descuento_volumen || 0) +
      parseFloat(liquidacion.descuento_institucional || 0)
    ).toFixed(2);

    // Persistir la sesión en la base de datos (PostgreSQL)
    const sesionDb = await CheckoutSesion.create({
      usuario_id: usuarioId,
      token_sesion: tokenSesion,
      idempotency_key: idempotencyKey,
      expira_en: expiraEn,
      estado: "iniciada",
      subtotal_base: liquidacion.subtotal_base,
      descuento_total: descuentoTotal,
      total_impuestos: liquidacion.total_impuestos,
      total_final: liquidacion.total_final,
      total_unidades: totalUnidades,
      detalles_items: detallesItems,
      desglose_reglas: liquidacion,
    });

    // 5. Registrar sesión de checkout activa con limitador de 10 minutos
    const sesionCheckout = {
      id: sesionDb.id,
      token_sesion: tokenSesion,
      usuario_id: usuarioId,
      carrito_id: carrito.id,
      idempotency_key: idempotencyKey,
      iniciado_en: new Date(ahora),
      expira_en: expiraEn,
      duracion_ms: DURACION_CHECKOUT_MS,
      duracion_segundos: DURACION_CHECKOUT_MS / 1000, // 600 segundos
      estado: "iniciada",
      liquidacion,
      items: carrito.items,
    };

    sesionesCheckoutActivas.set(usuarioId, sesionCheckout);

    // 6. Activar temporizador WebSocket en vivo (Emisión periódica cada segundo)
    if (temporizadoresCheckout.has(usuarioId)) {
      clearInterval(temporizadoresCheckout.get(usuarioId));
      temporizadoresCheckout.delete(usuarioId);
    }

    const intervalId = setInterval(async () => {
      const sesion = sesionesCheckoutActivas.get(usuarioId);
      if (!sesion || sesion.estado !== "iniciada") {
        clearInterval(intervalId);
        temporizadoresCheckout.delete(usuarioId);
        return;
      }

      const diffMs = new Date(sesion.expira_en).getTime() - Date.now();
      const segundosRestantes = Math.max(0, Math.floor(diffMs / 1000));

      if (segundosRestantes <= 0) {
        sesion.estado = "expirada";
        sesionesCheckoutActivas.delete(usuarioId);
        clearInterval(intervalId);
        temporizadoresCheckout.delete(usuarioId);

        // Actualizar en base de datos estado a expirada
        await CheckoutSesion.update(
          { estado: "expirada" },
          { where: { id: sesion.id, estado: "iniciada" } }
        ).catch(() => {});

        // Notificar inmediatamente por WebSocket la expiración de los 10 minutos
        emitirExpiracionCheckout(usuarioId, {
          mensaje: "El periodo de 10 minutos para confirmar la compra ha expirado. Regresando automáticamente a la tienda...",
        });
      } else {
        // Notificar tick por WebSocket cada segundo
        emitirTickCheckout(usuarioId, {
          tiempo_restante_segundos: segundosRestantes,
          expira_en: sesion.expira_en,
        });
      }
    }, 1000);

    // Evitar que el timer bloquee la salida del proceso Node
    intervalId.unref?.();
    temporizadoresCheckout.set(usuarioId, intervalId);

    // Emitir el primer tick de inicio
    emitirTickCheckout(usuarioId, {
      tiempo_restante_segundos: 600,
      expira_en: expiraEn.toISOString(),
    });

    return res.status(200).json({
      ok: true,
      mensaje: "Sesión de checkout iniciada. Tiene 10 minutos para confirmar su compra.",
      data: {
        token_sesion: tokenSesion,
        idempotency_key: idempotencyKey,
        iniciado_en: sesionCheckout.iniciado_en,
        expira_en: expiraEn.toISOString(),
        tiempo_limite_segundos: 600,
        tiempo_restante_segundos: 600,
        websocket_room: `checkout:${usuarioId}`,
        liquidacion,
        items_count: carrito.items.length,
      },
    });
  } catch (error) {
    console.error("Error al iniciar checkout:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al iniciar el checkout",
      error: error.message,
    });
  }
};

/**
 * Consultar el estado y tiempo restante del checkout (Control de los 10 minutos)
 */
export const obtenerEstadoCheckout = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // 1. Consultar persistencia en base de datos
    let sesionDb = await CheckoutSesion.findOne({
      where: { usuario_id: usuarioId, estado: "iniciada" },
      order: [["created_at", "DESC"]],
    });

    if (!sesionDb) {
      sesionesCheckoutActivas.delete(usuarioId);
      if (temporizadoresCheckout.has(usuarioId)) {
        clearInterval(temporizadoresCheckout.get(usuarioId));
        temporizadoresCheckout.delete(usuarioId);
      }

      return res.status(200).json({
        ok: false,
        activa: false,
        expiro: true,
        redirigir_tienda: true,
        ruta_redireccion: "/tienda",
        mensaje: "No hay una sesión de checkout activa. Regresando a la tienda.",
      });
    }

    // 2. Si transcurrieron los 10 minutos -> EXPIRA AUTOMÁTICAMENTE
    if (sesionDb.estaExpirada()) {
      await sesionDb.update({ estado: "expirada" });
      sesionesCheckoutActivas.delete(usuarioId);

      if (temporizadoresCheckout.has(usuarioId)) {
        clearInterval(temporizadoresCheckout.get(usuarioId));
        temporizadoresCheckout.delete(usuarioId);
      }

      emitirExpiracionCheckout(usuarioId, {
        mensaje: "El tiempo límite de 10 minutos para confirmar la compra ha expirado.",
      });

      return res.status(200).json({
        ok: false,
        activa: false,
        expiro: true,
        redirigir_tienda: true,
        ruta_redireccion: "/tienda",
        mensaje: "El tiempo límite de 10 minutos para confirmar la compra ha expirado. Redirigiendo a la tienda...",
      });
    }

    const segundosRestantes = sesionDb.tiempoRestanteSegundos();

    return res.status(200).json({
      ok: true,
      activa: true,
      expiro: false,
      token_sesion: sesionDb.token_sesion,
      idempotency_key: sesionDb.idempotency_key,
      tiempo_restante_segundos: segundosRestantes,
      expira_en: sesionDb.expira_en,
      liquidacion: sesionDb.desglose_reglas,
      items: sesionDb.detalles_items,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al consultar estado de checkout",
      error: error.message,
    });
  }
};

/**
 * Cancelar voluntariamente el checkout y retornar a la tienda
 */
export const cancelarCheckout = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Actualizar en base de datos
    await CheckoutSesion.update(
      { estado: "cancelada" },
      { where: { usuario_id: usuarioId, estado: "iniciada" } }
    );

    sesionesCheckoutActivas.delete(usuarioId);

    if (temporizadoresCheckout.has(usuarioId)) {
      clearInterval(temporizadoresCheckout.get(usuarioId));
      temporizadoresCheckout.delete(usuarioId);
    }

    emitirCheckoutCancelado(usuarioId);

    return res.status(200).json({
      ok: true,
      redirigir_tienda: true,
      ruta_redireccion: "/tienda",
      mensaje: "Checkout cancelado. Ha regresado a la tienda.",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al cancelar checkout",
      error: error.message,
    });
  }
};

/**
 * RF-03.3 Cierre y Confirmación de Orden
 * Con control estricto de Idempotencia y Limitador de Tiempo de 10 minutos
 */
export const crearOrden = async (req, res) => {
  const usuarioId = req.usuario.id;
  const rolNombre = req.usuario.rol;
  const { direccion_entrega } = req.body;

  // Extracción de la llave de idempotencia desde cabeceras o cuerpo
  const idempotencyKey =
    req.headers["idempotency-key"] ||
    req.headers["x-idempotency-key"] ||
    req.body.idempotency_key;

  if (!direccion_entrega || !direccion_entrega.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "La dirección de entrega es obligatoria para confirmar la compra",
    });
  }

  // =========================================================================
  // 1. CONTROL DE IDEMPOTENCIA
  // =========================================================================
  if (idempotencyKey) {
    const registroPrevio = await obtenerRegistroIdempotente(idempotencyKey);
    if (registroPrevio && registroPrevio.data) {
      res.setHeader("X-Idempotency-Replay", "true");
      return res.status(200).json({
        ok: true,
        idempotente: true,
        mensaje: "Operación idempotente: La orden ya fue confirmada previamente sin duplicar cobros ni stock.",
        data: registroPrevio.data,
      });
    }

    const ordenExistente = await Orden.findOne({
      where: { idempotency_key: idempotencyKey },
      include: [
        {
          model: OrdenDetalle,
          as: "detalles",
          include: [{ model: Catalogo_Productos, as: "producto" }],
        },
      ],
    });

    if (ordenExistente) {
      res.setHeader("X-Idempotency-Replay", "true");
      await guardarRegistroIdempotente(idempotencyKey, { orden: ordenExistente }, usuarioId);
      return res.status(200).json({
        ok: true,
        idempotente: true,
        mensaje: "Operación idempotente: Orden ya registrada en el sistema.",
        data: { orden: ordenExistente },
      });
    }
  }

  // =========================================================================
  // 2. LIMITADOR DE TIEMPO (10 MINUTOS MÁXIMO) CON PERSISTENCIA EN BD
  // =========================================================================
  let sesionDb = null;
  if (idempotencyKey) {
    sesionDb = await CheckoutSesion.findOne({
      where: { idempotency_key: idempotencyKey },
    });
  }

  if (!sesionDb) {
    sesionDb = await CheckoutSesion.findOne({
      where: { usuario_id: usuarioId, estado: "iniciada" },
      order: [["created_at", "DESC"]],
    });
  }

  if (sesionDb) {
    if (sesionDb.estaExpirada() || sesionDb.estado === "expirada") {
      await sesionDb.update({ estado: "expirada" });
      sesionesCheckoutActivas.delete(usuarioId);

      if (temporizadoresCheckout.has(usuarioId)) {
        clearInterval(temporizadoresCheckout.get(usuarioId));
        temporizadoresCheckout.delete(usuarioId);
      }

      emitirExpiracionCheckout(usuarioId, {
        mensaje: "El periodo límite de 10 minutos ha expirado. Regresando a la tienda...",
      });

      return res.status(410).json({
        ok: false,
        expiro: true,
        redirigir_tienda: true,
        ruta_redireccion: "/tienda",
        mensaje: "El periodo límite de 10 minutos para confirmar su compra ha expirado. Ha sido redirigido a la tienda.",
      });
    }
  }

  const finalIdempotencyKey = idempotencyKey || generarIdempotencyKey(usuarioId, "direct", Date.now());

  // =========================================================================
  // 3. PROCESAMIENTO TRANSACCIONAL SEGURO
  // =========================================================================
  const transaction = await sequelize.transaction();
  try {
    const carrito = await Carritos.findOne({
      where: { usuario_id: usuarioId },
      include: [
        {
          model: CarritoItem,
          as: "items",
          include: [{ model: Catalogo_Productos, as: "producto" }],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!carrito || !carrito.items || carrito.items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        mensaje: "El carrito de compras está vacío. No se puede procesar la orden.",
      });
    }

    const itemsParaCalculo = [];
    const detallesParaCrear = [];

    for (const item of carrito.items) {
      const producto = await Catalogo_Productos.findByPk(item.producto_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!producto || !producto.activo) {
        await transaction.rollback();
        return res.status(400).json({
          ok: false,
          mensaje: `El producto ID ${item.producto_id} no está disponible actualmente`,
        });
      }

      if (producto.stock_disponible < item.cantidad) {
        await transaction.rollback();
        return res.status(400).json({
          ok: false,
          mensaje: `Stock insuficiente para '${producto.isbn}'. Disponible: ${producto.stock_disponible}, solicitado: ${item.cantidad}`,
        });
      }

      producto.stock_disponible -= item.cantidad;
      await producto.save({ transaction });

      const precioUnitario = parseFloat(producto.precio_base);
      const subtotalLinea = +(precioUnitario * item.cantidad).toFixed(2);

      itemsParaCalculo.push({
        cantidad: item.cantidad,
        precio_unitario: precioUnitario,
      });

      detallesParaCrear.push({
        producto_id: producto.id,
        cantidad: item.cantidad,
        precio_unitario_historico: precioUnitario,
        subtotal_linea: subtotalLinea,
      });
    }

    const liquidacion = Orden.calcularTotales({
      items: itemsParaCalculo,
      rolNombre,
    });

    const nuevaOrden = await Orden.create(
      {
        numero_orden: generarNumeroOrden(),
        usuario_id: usuarioId,
        idempotency_key: finalIdempotencyKey,
        subtotal_base: liquidacion.subtotal_base,
        descuento_volumen: liquidacion.descuento_volumen,
        porcentaje_descuento_volumen: liquidacion.porcentaje_descuento_volumen,
        descuento_institucional: liquidacion.descuento_institucional,
        porcentaje_descuento_institucional: liquidacion.porcentaje_descuento_institucional,
        total_impuestos: liquidacion.total_impuestos,
        total_final: liquidacion.total_final,
        estado: "Pendiente",
        direccion_entrega: direccion_entrega.trim(),
        fecha_orden: new Date(),
      },
      { transaction }
    );

    for (const detalle of detallesParaCrear) {
      await OrdenDetalle.create(
        {
          ...detalle,
          orden_id: nuevaOrden.id,
        },
        { transaction }
      );
    }

    await CarritoItem.destroy({
      where: { carrito_id: carrito.id },
      transaction,
    });

    // Actualizar sesión de checkout en base de datos si existe
    if (sesionDb) {
      await sesionDb.update(
        {
          estado: "completada",
          orden_id: nuevaOrden.id,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Detener el temporizador de WebSocket
    if (temporizadoresCheckout.has(usuarioId)) {
      clearInterval(temporizadoresCheckout.get(usuarioId));
      temporizadoresCheckout.delete(usuarioId);
    }

    sesionesCheckoutActivas.delete(usuarioId);

    const ordenCompleta = await Orden.findByPk(nuevaOrden.id, {
      include: [
        {
          model: OrdenDetalle,
          as: "detalles",
          include: [
            {
              model: Catalogo_Productos,
              as: "producto",
              include: [
                { model: Formatos, as: "formato" },
                { model: Libros, as: "libro" },
              ],
            },
          ],
        },
      ],
    });

    const respuestaFinal = {
      orden: ordenCompleta,
      desglose_reglas: liquidacion,
      idempotency_key: finalIdempotencyKey,
    };

    await guardarRegistroIdempotente(finalIdempotencyKey, respuestaFinal, usuarioId);

    // =========================================================================
    // 4. NOTIFICACIONES EN VIVO POR WEBSOCKET
    // =========================================================================
    emitirCheckoutCompletado(usuarioId, ordenCompleta);
    emitirNuevaOrden(ordenCompleta);
    emitirCatalogoActualizado({ motivo: "venta" });
    emitirCarritoActualizado(usuarioId, { motivo: "orden_creada" });
    emitirNuevaVenta({
      numero_orden: ordenCompleta.numero_orden,
      total_final: ordenCompleta.total_final,
      cliente_id: usuarioId,
      fecha: new Date().toISOString(),
    });

    // Actualizar reportería en vivo para todos los administradores conectados
    refrescarReporteriaEnVivo().catch(() => {});

    return res.status(201).json({
      ok: true,
      mensaje: "Compra confirmada exitosamente dentro del periodo de 10 minutos",
      data: respuestaFinal,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al procesar orden:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al procesar el cierre de orden",
      error: error.message,
    });
  }
};

/**
 * RF-02 / RF-03.3 Historial de pedidos para el cliente autenticado
 */
export const misOrdenes = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const ordenes = await Orden.findAll({
      where: { usuario_id: usuarioId },
      include: [
        {
          model: OrdenDetalle,
          as: "detalles",
          include: [
            {
              model: Catalogo_Productos,
              as: "producto",
              include: [
                { model: Formatos, as: "formato" },
                { model: Libros, as: "libro" },
              ],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      ok: true,
      total: ordenes.length,
      data: ordenes,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener historial de órdenes",
      error: error.message,
    });
  }
};

/**
 * Obtener detalle de una orden por ID
 */
export const obtenerOrdenPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;
    const rol = req.usuario.rol;

    const orden = await Orden.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "email", "nombres", "apellidos", "telefono"],
          include: [{ model: Rol, as: "rol" }],
        },
        {
          model: OrdenDetalle,
          as: "detalles",
          include: [
            {
              model: Catalogo_Productos,
              as: "producto",
              include: [
                { model: Formatos, as: "formato" },
                { model: Libros, as: "libro" },
              ],
            },
          ],
        },
      ],
    });

    if (!orden) {
      return res.status(404).json({ ok: false, mensaje: "Orden no encontrada" });
    }

    const esStaff = ["ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"].includes(rol);
    if (!esStaff && orden.usuario_id !== usuarioId) {
      return res.status(403).json({ ok: false, mensaje: "No tiene permisos para ver esta orden" });
    }

    return res.status(200).json({
      ok: true,
      data: orden,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener orden",
      error: error.message,
    });
  }
};

/**
 * RF-05.2 Monitoreo de órdenes para Administradores y Asesores
 */
export const listarTodasLasOrdenes = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) {
      where.estado = estado;
    }

    const ordenes = await Orden.findAll({
      where,
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "email", "nombres", "apellidos", "telefono"],
          include: [{ model: Rol, as: "rol" }],
        },
        {
          model: OrdenDetalle,
          as: "detalles",
          include: [
            {
              model: Catalogo_Productos,
              as: "producto",
              include: [
                { model: Formatos, as: "formato" },
                { model: Libros, as: "libro" },
              ],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      ok: true,
      total: ordenes.length,
      data: ordenes,
    });
  } catch (error) {
    console.error("Error al listar órdenes:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error al listar órdenes",
      error: error.message,
    });
  }
};

/**
 * RF-05.2 Actualización de estado de una orden (Admin / Asesor)
 */
export const actualizarEstadoOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosPermitidos = ["Pendiente", "Aprobado", "Enviado", "Cancelado"];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        ok: false,
        mensaje: `Estado inválido. Debe ser uno de: ${estadosPermitidos.join(", ")}`,
      });
    }

    const orden = await Orden.findByPk(id);
    if (!orden) {
      return res.status(404).json({ ok: false, mensaje: "Orden no encontrada" });
    }

    orden.estado = estado;
    await orden.save();

    emitirActualizacionOrden(orden);

    // Actualizar reportería en vivo tras cambio de estado
    refrescarReporteriaEnVivo().catch(() => {});

    return res.status(200).json({
      ok: true,
      mensaje: `Estado de la orden actualizado a '${estado}'`,
      data: orden,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al actualizar estado de la orden",
      error: error.message,
    });
  }
};
