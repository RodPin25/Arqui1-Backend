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
} from "../models/index.js";

/**
 * Generador de número de orden único legible (ej. ORD-20261112-AB12)
 */
const generarNumeroOrden = () => {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${hoy}-${randomStr}`;
};

/**
 * RF-03.3 Cierre de Orden / Checkout a partir del Carrito
 */
export const crearOrden = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const usuarioId = req.usuario.id;
    const rolNombre = req.usuario.rol;
    const { direccion_entrega } = req.body;

    if (!direccion_entrega || !direccion_entrega.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        mensaje: "La dirección de entrega es obligatoria para procesar la orden",
      });
    }

    // 1. Obtener carrito y sus items
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
        mensaje: "El carrito de compras está vacío. No se puede generar una orden.",
      });
    }

    // 2. Verificar y descontar stock de cada producto
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
          mensaje: `Stock insuficiente para el producto '${producto.isbn}'. Disponible: ${producto.stock_disponible}, solicitado: ${item.cantidad}`,
        });
      }

      // Restar stock
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

    // 3. Ejecutar la lógica de negocio y reglas de descuento en el MODELO
    const liquidacion = Orden.calcularTotales({
      items: itemsParaCalculo,
      rolNombre,
    });

    // 4. Crear la orden de compra
    const nuevaOrden = await Orden.create(
      {
        numero_orden: generarNumeroOrden(),
        usuario_id: usuarioId,
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

    // 5. Crear los detalles de la orden
    for (const detalle of detallesParaCrear) {
      await OrdenDetalle.create(
        {
          ...detalle,
          orden_id: nuevaOrden.id,
        },
        { transaction }
      );
    }

    // 6. Vaciar el carrito del usuario
    await CarritoItem.destroy({
      where: { carrito_id: carrito.id },
      transaction,
    });

    await transaction.commit();

    // 7. Retornar la orden completa
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

    return res.status(201).json({
      ok: true,
      mensaje: "Orden de compra generada exitosamente",
      data: {
        orden: ordenCompleta,
        desglose_reglas: liquidacion,
      },
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

    // Si es cliente, solo puede ver sus propias órdenes
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
 * Filtrado por estado: Pendiente, Aprobado, Enviado, Cancelado
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
