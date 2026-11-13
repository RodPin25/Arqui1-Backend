import {
  Carritos,
  CarritoItem,
  Catalogo_Productos,
  Libros,
  Formatos,
  Autores,
} from "../models/index.js";
import { emitirCarritoActualizado } from "../services/socket.service.js";

/**
 * Obtener o inicializar el carrito del usuario autenticado
 */
const obtenerOCrearCarrito = async (usuarioId) => {
  let [carrito] = await Carritos.findOrCreate({
    where: { usuario_id: usuarioId },
    defaults: { usuario_id: usuarioId },
  });
  return carrito;
};

/**
 * RF-03.1 Obtener el carrito activo del usuario con cálculo dinámico del Modelo
 */
export const obtenerCarrito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const rolNombre = req.usuario.rol;

    const carrito = await obtenerOCrearCarrito(usuarioId);

    const items = await CarritoItem.findAll({
      where: { carrito_id: carrito.id },
      include: [
        {
          model: Catalogo_Productos,
          as: "producto",
          include: [
            {
              model: Formatos,
              as: "formato",
              attributes: ["id", "codigo", "nombre"],
            },
            {
              model: Libros,
              as: "libro",
              attributes: ["id", "titulo", "portada_url"],
              include: [
                {
                  model: Autores,
                  as: "autores",
                  attributes: ["id", "nombres", "apellidos"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    // Mapear items para el cálculo del Modelo
    const itemsParaCalculo = items.map((it) => ({
      cantidad: it.cantidad,
      precio_unitario: it.producto ? it.producto.precio_base : 0,
    }));

    // Invocación a la lógica de negocio encapsulada estrictamente en el Modelo
    const liquidacion = Carritos.calcularTotales({
      items: itemsParaCalculo,
      rolNombre,
    });

    return res.status(200).json({
      ok: true,
      data: {
        carrito_id: carrito.id,
        items,
        liquidacion,
      },
    });
  } catch (error) {
    console.error("Error al obtener carrito:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al obtener el carrito de compras",
      error: error.message,
    });
  }
};

/**
 * RF-03.1 Agregar un ítem al carrito
 */
export const agregarAlCarrito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { producto_id, cantidad = 1 } = req.body;

    const cantNum = parseInt(cantidad, 10);
    if (!producto_id || isNaN(cantNum) || cantNum <= 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "producto_id válido y cantidad mayor a 0 son obligatorios",
      });
    }

    // Verificar existencia y stock del producto en el catálogo
    const producto = await Catalogo_Productos.findByPk(producto_id);
    if (!producto || !producto.activo) {
      return res.status(404).json({
        ok: false,
        mensaje: "El producto no existe o se encuentra inactivo",
      });
    }

    if (producto.stock_disponible < cantNum) {
      return res.status(400).json({
        ok: false,
        mensaje: `Stock insuficiente. Disponible: ${producto.stock_disponible}`,
      });
    }

    const carrito = await obtenerOCrearCarrito(usuarioId);

    // Si ya existe el producto en el carrito, sumamos cantidad
    let item = await CarritoItem.findOne({
      where: { carrito_id: carrito.id, producto_id },
    });

    if (item) {
      const nuevaCantidad = item.cantidad + cantNum;
      if (producto.stock_disponible < nuevaCantidad) {
        return res.status(400).json({
          ok: false,
          mensaje: `No puede añadir más unidades. Stock disponible: ${producto.stock_disponible}, actualmente en carrito: ${item.cantidad}`,
        });
      }
      item.cantidad = nuevaCantidad;
      await item.save();
    } else {
      item = await CarritoItem.create({
        carrito_id: carrito.id,
        producto_id,
        cantidad: cantNum,
      });
    }

    emitirCarritoActualizado(usuarioId, { motivo: "item_agregado" });

    return res.status(200).json({
      ok: true,
      mensaje: "Producto añadido al carrito",
      data: item,
    });
  } catch (error) {
    console.error("Error al agregar ítem al carrito:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error al agregar ítem al carrito",
      error: error.message,
    });
  }
};

/**
 * RF-03.1 Actualizar cantidad de un ítem en el carrito
 */
export const actualizarCantidadItem = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { itemId } = req.params;
    const { cantidad } = req.body;

    const cantNum = parseInt(cantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "La cantidad debe ser un entero positivo mayor a 0",
      });
    }

    const carrito = await obtenerOCrearCarrito(usuarioId);
    const item = await CarritoItem.findOne({
      where: { id: itemId, carrito_id: carrito.id },
      include: [{ model: Catalogo_Productos, as: "producto" }],
    });

    if (!item) {
      return res.status(404).json({ ok: false, mensaje: "Ítem no encontrado en su carrito" });
    }

    if (item.producto.stock_disponible < cantNum) {
      return res.status(400).json({
        ok: false,
        mensaje: `Stock insuficiente. Máximo disponible: ${item.producto.stock_disponible}`,
      });
    }

    item.cantidad = cantNum;
    await item.save();

    emitirCarritoActualizado(usuarioId, { motivo: "cantidad_actualizada" });

    return res.status(200).json({
      ok: true,
      mensaje: "Cantidad actualizada",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al actualizar cantidad",
      error: error.message,
    });
  }
};

/**
 * RF-03.1 Eliminar ítem del carrito
 */
export const eliminarItemCarrito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { itemId } = req.params;

    const carrito = await obtenerOCrearCarrito(usuarioId);
    const filasBorradas = await CarritoItem.destroy({
      where: { id: itemId, carrito_id: carrito.id },
    });

    if (filasBorradas === 0) {
      return res.status(404).json({ ok: false, mensaje: "Ítem no encontrado en el carrito" });
    }

    emitirCarritoActualizado(usuarioId, { motivo: "item_eliminado" });

    return res.status(200).json({
      ok: true,
      mensaje: "Ítem eliminado del carrito",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al eliminar ítem",
      error: error.message,
    });
  }
};

/**
 * RF-03.1 Vaciar todo el carrito
 */
export const vaciarCarrito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const carrito = await obtenerOCrearCarrito(usuarioId);

    await CarritoItem.destroy({ where: { carrito_id: carrito.id } });

    emitirCarritoActualizado(usuarioId, { motivo: "carrito_vaciado" });

    return res.status(200).json({
      ok: true,
      mensaje: "Carrito vaciado exitosamente",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al vaciar carrito",
      error: error.message,
    });
  }
};
