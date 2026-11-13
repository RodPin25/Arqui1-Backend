import { Op } from "sequelize";
import { Autores, Libros } from "../models/index.js";

/**
 * RF-05.1: Listar autores con soporte para búsqueda y conteo de obras asociadas
 * GET /api/autores o GET /api/catalogo/autores
 */
export const listarAutores = async (req, res) => {
  try {
    const { q, limit, offset, incluir_libros } = req.query;

    const where = {};
    if (q && q.trim()) {
      const termino = `%${q.trim()}%`;
      where[Op.or] = [
        { nombres: { [Op.iLike]: termino } },
        { apellidos: { [Op.iLike]: termino } },
        { biografia: { [Op.iLike]: termino } },
      ];
    }

    const include = [];
    if (incluir_libros === "true" || incluir_libros === "1") {
      include.push({
        model: Libros,
        as: "libros",
        attributes: ["id", "titulo", "portada_url", "anio_edicion"],
        through: { attributes: [] },
      });
    }

    const opciones = {
      where,
      include,
      order: [
        ["apellidos", "ASC"],
        ["nombres", "ASC"],
      ],
    };

    if (limit) opciones.limit = parseInt(limit, 10);
    if (offset) opciones.offset = parseInt(offset, 10);

    const autores = await Autores.findAll(opciones);

    return res.status(200).json({
      ok: true,
      total: autores.length,
      data: autores,
    });
  } catch (error) {
    console.error("Error al listar autores:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al obtener los autores",
      error: error.message,
    });
  }
};

/**
 * Obtener autor por ID con detalle de libros asociados
 * GET /api/autores/:id
 */
export const obtenerAutorPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const autor = await Autores.findByPk(id, {
      include: [
        {
          model: Libros,
          as: "libros",
          attributes: ["id", "titulo", "sinopsis", "portada_url", "anio_edicion", "activo"],
          through: { attributes: [] },
        },
      ],
    });

    if (!autor) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontró el autor con ID ${id}`,
      });
    }

    return res.status(200).json({
      ok: true,
      data: autor,
    });
  } catch (error) {
    console.error("Error al obtener autor:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al consultar el autor",
      error: error.message,
    });
  }
};

/**
 * RF-05.1: Crear un nuevo autor en el catálogo (Admin / Asesor)
 * POST /api/autores o POST /api/catalogo/autores
 */
export const crearAutor = async (req, res) => {
  try {
    const { nombres, apellidos, biografia } = req.body;

    if (!nombres || !nombres.trim() || !apellidos || !apellidos.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: "Los campos 'nombres' y 'apellidos' son obligatorios para registrar un autor",
      });
    }

    const nuevoAutor = await Autores.create({
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      biografia: biografia ? biografia.trim() : null,
    });

    return res.status(201).json({
      ok: true,
      mensaje: "Autor registrado exitosamente",
      data: nuevoAutor,
    });
  } catch (error) {
    console.error("Error al crear autor:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al crear el autor",
      error: error.message,
    });
  }
};

/**
 * RF-05.1: Actualizar información de un autor existente (Admin)
 * PUT /api/autores/:id o PUT /api/catalogo/autores/:id
 */
export const actualizarAutor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, biografia } = req.body;

    const autor = await Autores.findByPk(id);
    if (!autor) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontró el autor con ID ${id} para actualizar`,
      });
    }

    if (nombres !== undefined) {
      if (!nombres || !nombres.trim()) {
        return res.status(400).json({ ok: false, mensaje: "El campo 'nombres' no puede estar vacío" });
      }
      autor.nombres = nombres.trim();
    }

    if (apellidos !== undefined) {
      if (!apellidos || !apellidos.trim()) {
        return res.status(400).json({ ok: false, mensaje: "El campo 'apellidos' no puede estar vacío" });
      }
      autor.apellidos = apellidos.trim();
    }

    if (biografia !== undefined) {
      autor.biografia = biografia ? biografia.trim() : null;
    }

    await autor.save();

    return res.status(200).json({
      ok: true,
      mensaje: "Autor actualizado exitosamente",
      data: autor,
    });
  } catch (error) {
    console.error("Error al actualizar autor:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al actualizar el autor",
      error: error.message,
    });
  }
};

/**
 * RF-05.1: Eliminación lógica (soft-delete) de un autor (Admin)
 * DELETE /api/autores/:id o DELETE /api/catalogo/autores/:id
 */
export const eliminarAutor = async (req, res) => {
  try {
    const { id } = req.params;

    const autor = await Autores.findByPk(id, {
      include: [{ model: Libros, as: "libros" }],
    });

    if (!autor) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontró el autor con ID ${id}`,
      });
    }

    // Eliminación lógica permitida por paranoid: true
    await autor.destroy();

    return res.status(200).json({
      ok: true,
      mensaje: `Autor '${autor.nombres} ${autor.apellidos}' eliminado exitosamente (baja lógica)`,
      data: { id: autor.id },
    });
  } catch (error) {
    console.error("Error al eliminar autor:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al eliminar el autor",
      error: error.message,
    });
  }
};
