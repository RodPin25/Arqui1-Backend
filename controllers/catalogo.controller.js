import { Op } from "sequelize";
import {
  Catalogo_Productos,
  Libros,
  Formatos,
  Autores,
  Generos,
  Editorial,
  sequelize,
} from "../models/index.js";
import { subirACloudinary } from "../config/cloudinary.js";
import { emitirCatalogoActualizado } from "../services/socket.service.js";

export {
  listarAutores,
  obtenerAutorPorId,
  crearAutor,
  actualizarAutor,
  eliminarAutor,
} from "./autor.controller.js";

/**
 * Listado paginado y con filtros de productos en catálogo
 * Query params: q, genero_id, formato_id, min_precio, max_precio, en_stock, orden, page, limit
 */
export const listarProductos = async (req, res) => {
  try {
    const {
      q,
      genero_id,
      formato_id,
      autor_id,
      editorial_id,
      min_precio,
      max_precio,
      en_stock,
      orden = "recientes",
      page = 1,
      limit = 12,
    } = req.query;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    // Filtros sobre la tabla catalogo_productos
    const whereProducto = { activo: true };

    if (formato_id) {
      whereProducto.formato_id = formato_id;
    }

    if (min_precio !== undefined || max_precio !== undefined) {
      whereProducto.precio_base = {};
      if (min_precio !== undefined) {
        whereProducto.precio_base[Op.gte] = parseFloat(min_precio);
      }
      if (max_precio !== undefined) {
        whereProducto.precio_base[Op.lte] = parseFloat(max_precio);
      }
    }

    if (en_stock === "true" || en_stock === true) {
      whereProducto.stock_disponible = { [Op.gt]: 0 };
    }

    // Filtros sobre el libro y búsqueda textual (Título, Sinopsis, ISBN, Autor)
    const whereLibro = { activo: true };
    if (q) {
      const qClean = q.trim();
      const patron = `%${qClean}%`;
      const librosPorAutor = await Libros.findAll({
        attributes: ["id"],
        include: [
          {
            model: Autores,
            as: "autores",
            attributes: [],
            through: { attributes: [] },
            where: {
              [Op.or]: [
                { nombres: { [Op.iLike]: patron } },
                { apellidos: { [Op.iLike]: patron } },
                sequelize.where(
                  sequelize.fn("concat", sequelize.col("autores.nombres"), " ", sequelize.col("autores.apellidos")),
                  { [Op.iLike]: patron }
                ),
              ],
            },
            required: true,
          },
        ],
        raw: true,
      });
      const idsLibrosAutor = librosPorAutor.map((l) => l.id);

      whereProducto[Op.or] = [
        { isbn: { [Op.iLike]: patron } },
        { "$libro.titulo$": { [Op.iLike]: patron } },
        { "$libro.sinopsis$": { [Op.iLike]: patron } },
        ...(idsLibrosAutor.length ? [{ libro_id: { [Op.in]: idsLibrosAutor } }] : []),
      ];
    }

    // Filtro por género si viene indicado
    const includeGeneros = {
      model: Generos,
      as: "generos",
      through: { attributes: [] },
      ...(genero_id ? { where: { id: genero_id } } : {}),
    };

    // Ordenamiento
    let orderClause = [["created_at", "DESC"]];
    if (orden === "precio_asc") {
      orderClause = [["precio_base", "ASC"]];
    } else if (orden === "precio_desc") {
      orderClause = [["precio_base", "DESC"]];
    } else if (orden === "alfabetico") {
      orderClause = [{ model: Libros, as: "libro" }, "titulo", "ASC"];
    }

    const { rows: productos, count: total } = await Catalogo_Productos.findAndCountAll({
      where: whereProducto,
      include: [
        {
          model: Formatos,
          as: "formato",
          attributes: ["id", "codigo", "nombre"],
        },
        {
          model: Libros,
          as: "libro",
          where: whereLibro,
          include: [
            {
              model: Autores,
              as: "autores",
              attributes: ["id", "nombres", "apellidos"],
              through: { attributes: [] },
              ...(autor_id ? { where: { id: autor_id } } : {}),
            },
            includeGeneros,
            {
              model: Editorial,
              as: "editoriales",
              attributes: ["id", "nombre"],
              through: { attributes: [] },
              ...(editorial_id ? { where: { id: editorial_id } } : {}),
            },
          ],
        },
      ],
      order: orderClause,
      limit: limitNum,
      offset,
      distinct: true, // Importante para conteos correctos con includes N:M
    });

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      ok: true,
      data: productos,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error al listar catálogo:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al obtener catálogo de productos",
      error: error.message,
    });
  }
};

/**
 * Obtener detalle de un producto por ID con sus variantes disponibles
 */
export const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Catalogo_Productos.findByPk(id, {
      include: [
        {
          model: Formatos,
          as: "formato",
          attributes: ["id", "codigo", "nombre"],
        },
        {
          model: Libros,
          as: "libro",
          include: [
            {
              model: Autores,
              as: "autores",
              through: { attributes: ["orden_autoria"] },
            },
            {
              model: Generos,
              as: "generos",
              through: { attributes: [] },
            },
            {
              model: Editorial,
              as: "editoriales",
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!producto) {
      return res.status(404).json({
        ok: false,
        mensaje: "Producto no encontrado en el catálogo",
      });
    }

    // Buscar otras variantes del mismo libro (ej. si está viendo Tapa Blanda, mostrar Tapa Dura o Ebook)
    const otrasVariantes = await Catalogo_Productos.findAll({
      where: {
        libro_id: producto.libro_id,
        id: { [Op.ne]: producto.id },
        activo: true,
      },
      include: [
        {
          model: Formatos,
          as: "formato",
          attributes: ["id", "codigo", "nombre"],
        },
      ],
      attributes: ["id", "isbn", "precio_base", "stock_disponible"],
    });

    return res.status(200).json({
      ok: true,
      data: {
        ...producto.toJSON(),
        otras_variantes: otrasVariantes,
      },
    });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener producto del catálogo",
      error: error.message,
    });
  }
};

/**
 * (Admin) Crear un producto en catálogo
 */
export const crearProducto = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      libro_id,
      formato_id,
      isbn,
      precio_base,
      stock_disponible = 0,
      libroNuevo, // Opcional: { titulo, sinopsis, anio_edicion, portada_url, autores_ids, generos_ids, editorial_id }
    } = req.body;

    if (!formato_id || !isbn || precio_base === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        mensaje: "formato_id, isbn y precio_base son campos requeridos",
      });
    }

    // Validar formato
    const formato = await Formatos.findByPk(formato_id);
    if (!formato) {
      await transaction.rollback();
      return res.status(404).json({ ok: false, mensaje: "Formato no encontrado" });
    }

    let idLibroFinal = libro_id;

    // Si no se proporcionó libro_id pero sí información para crear un nuevo libro
    if (!idLibroFinal && libroNuevo) {
      const { titulo, sinopsis, anio_edicion, portada_url, autores_ids, generos_ids, editorial_id } = libroNuevo;
      if (!titulo || !sinopsis || !anio_edicion) {
        await transaction.rollback();
        return res.status(400).json({
          ok: false,
          mensaje: "Para crear un nuevo libro se requiere titulo, sinopsis y anio_edicion",
        });
      }

      const nuevoLibro = await Libros.create(
        { titulo, sinopsis, anio_edicion, portada_url, activo: true },
        { transaction }
      );

      idLibroFinal = nuevoLibro.id;

      if (autores_ids && autores_ids.length > 0) {
        await nuevoLibro.setAutores(autores_ids, { transaction });
      }
      if (generos_ids && generos_ids.length > 0) {
        await nuevoLibro.setGeneros(generos_ids, { transaction });
      }
      if (editorial_id) {
        await nuevoLibro.setEditoriales([editorial_id], { transaction });
      }
    }

    if (!idLibroFinal) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        mensaje: "Debe especificar un libro_id existente o el objeto libroNuevo",
      });
    }

    // Verificar si el ISBN ya existe
    const existeIsbn = await Catalogo_Productos.findOne({ where: { isbn } });
    if (existeIsbn) {
      await transaction.rollback();
      return res.status(409).json({ ok: false, mensaje: "El ISBN ya se encuentra registrado en el catálogo" });
    }

    const nuevoProducto = await Catalogo_Productos.create(
      {
        libro_id: idLibroFinal,
        formato_id,
        isbn,
        precio_base,
        stock_disponible,
        activo: true,
      },
      { transaction }
    );

    await transaction.commit();

    // Obtener con relaciones completas
    const productoCreado = await Catalogo_Productos.findByPk(nuevoProducto.id, {
      include: [
        { model: Formatos, as: "formato" },
        {
          model: Libros,
          as: "libro",
          include: [
            { model: Autores, as: "autores", through: { attributes: [] } },
            { model: Generos, as: "generos", through: { attributes: [] } },
          ],
        },
      ],
    });

    emitirCatalogoActualizado({ motivo: "producto_creado", producto_id: productoCreado?.id });

    return res.status(201).json({
      ok: true,
      mensaje: "Producto agregado exitosamente al catálogo",
      data: productoCreado,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al crear producto:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al crear producto",
      error: error.message,
    });
  }
};

/**
 * (Admin) Actualizar precio, stock o estado de un producto del catálogo
 */
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { precio_base, stock_disponible, activo } = req.body;

    const producto = await Catalogo_Productos.findByPk(id);
    if (!producto) {
      return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    }

    if (precio_base !== undefined) producto.precio_base = precio_base;
    if (stock_disponible !== undefined) producto.stock_disponible = stock_disponible;
    if (activo !== undefined) producto.activo = activo;

    await producto.save();
    emitirCatalogoActualizado({ motivo: "producto_actualizado", producto_id: producto.id });

    return res.status(200).json({
      ok: true,
      mensaje: "Producto actualizado correctamente",
      data: producto,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al actualizar producto",
      error: error.message,
    });
  }
};

/**
 * (Admin) Eliminar producto de catálogo (Soft Delete)
 */
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Catalogo_Productos.findByPk(id);
    if (!producto) {
      return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    }

    await producto.destroy(); // Soft delete via deleted_at
    emitirCatalogoActualizado({ motivo: "producto_eliminado", producto_id: id });

    return res.status(200).json({
      ok: true,
      mensaje: "Producto retirado del catálogo con éxito",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al eliminar producto",
      error: error.message,
    });
  }
};

// ==========================================
// Controladores para Metadatos de Filtros
// ==========================================

export const listarGeneros = async (req, res) => {
  try {
    const generos = await Generos.findAll({
      order: [["nombre", "ASC"]],
    });
    return res.status(200).json({ ok: true, data: generos });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const listarFormatos = async (req, res) => {
  try {
    const formatos = await Formatos.findAll({
      order: [["nombre", "ASC"]],
    });
    return res.status(200).json({ ok: true, data: formatos });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};



export const listarEditoriales = async (req, res) => {
  try {
    const editoriales = await Editorial.findAll({
      order: [["nombre", "ASC"]],
    });
    return res.status(200).json({ ok: true, data: editoriales });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

/**
 * RF-01.1 Landing Page: Destacados, Novedades del mes y Banners promocionales
 */
export const obtenerLanding = async (req, res) => {
  try {
    // 1. Destacados (productos con stock y ordenados por id o variantes)
    const destacados = await Catalogo_Productos.findAll({
      where: { activo: true, stock_disponible: { [Op.gt]: 0 } },
      include: [
        { model: Formatos, as: "formato", attributes: ["id", "codigo", "nombre"] },
        {
          model: Libros,
          as: "libro",
          include: [
            { model: Autores, as: "autores", attributes: ["id", "nombres", "apellidos"], through: { attributes: [] } },
            { model: Generos, as: "generos", attributes: ["id", "nombre"], through: { attributes: [] } },
            { model: Editorial, as: "editoriales", attributes: ["id", "nombre"], through: { attributes: [] } },
          ],
        },
      ],
      limit: 6,
      order: [["precio_base", "DESC"]],
    });

    // 2. Novedades del mes (los más recientemente añadidos)
    const novedades = await Catalogo_Productos.findAll({
      where: { activo: true },
      include: [
        { model: Formatos, as: "formato", attributes: ["id", "codigo", "nombre"] },
        {
          model: Libros,
          as: "libro",
          include: [
            { model: Autores, as: "autores", attributes: ["id", "nombres", "apellidos"], through: { attributes: [] } },
            { model: Generos, as: "generos", attributes: ["id", "nombre"], through: { attributes: [] } },
          ],
        },
      ],
      limit: 6,
      order: [["created_at", "DESC"]],
    });

    // 3. Banners promocionales (Campañas activas)
    const banners = [
      {
        id: 1,
        titulo: "Gran Feria Editorial Universitaria",
        subtitulo: "Hasta 15% de descuento por volumen + 8% adicional para Instituciones Educativas",
        tag: "Descuentos Corporativos",
        boton_texto: "Ver Catálogo",
        boton_enlace: "#catalogo",
        color_fondo: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      },
      {
        id: 2,
        titulo: "Colección Obras Maestras del Pensamiento",
        subtitulo: "Ediciones de colección en tapa dura y formatos digitales para bibliotecas",
        tag: "Novedad Exclusiva",
        boton_texto: "Explorar Colección",
        boton_enlace: "#catalogo",
        color_fondo: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      },
      {
        id: 3,
        titulo: "Cotizaciones a Medida para Escuelas y Librerías",
        subtitulo: "Solicita tirajes especiales, papel premium y acabados personalizados con un asesor",
        tag: "Atención B2B",
        boton_texto: "Cotizar Ahora",
        boton_enlace: "#cotizaciones",
        color_fondo: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)",
      },
    ];

    return res.status(200).json({
      ok: true,
      data: {
        destacados,
        novedades,
        banners,
      },
    });
  } catch (error) {
    console.error("Error en landing:", error);
    return res.status(500).json({ ok: false, mensaje: "Error al obtener datos de portada", error: error.message });
  }
};

/**
 * RF-05.1 CRUD de Libros (Admin)
 */
/**
 * RF-05.1 Subir archivo de portada directamente a Cloudinary
 */
export const subirPortadaLibro = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debe proporcionar un archivo de imagen en el campo 'portada'",
      });
    }

    const resultado = await subirACloudinary(req.file.buffer);

    return res.status(200).json({
      ok: true,
      mensaje: "Portada subida exitosamente a Cloudinary",
      data: {
        url: resultado.secure_url,
        public_id: resultado.public_id,
        format: resultado.format,
        bytes: resultado.bytes,
      },
    });
  } catch (error) {
    console.error("Error al subir portada a Cloudinary:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al subir portada a Cloudinary",
      error: error.message,
    });
  }
};

/**
 * RF-05.1 CRUD de Libros (Admin) con soporte de subida a Cloudinary
 */
export const crearLibro = async (req, res) => {
  try {
    let { titulo, sinopsis, anio_edicion, portada_url, autores_ids, generos_ids, editorial_id } = req.body;
    if (!titulo) return res.status(400).json({ ok: false, mensaje: "El título es obligatorio" });

    // Si se subió un archivo físico de portada, subirlo a Cloudinary
    if (req.file) {
      const uploadRes = await subirACloudinary(req.file.buffer);
      portada_url = uploadRes.secure_url;
    }

    // Normalizar arrays si vienen por FormData (multipart/form-data)
    if (typeof autores_ids === "string") {
      try {
        autores_ids = JSON.parse(autores_ids);
      } catch (_) {
        autores_ids = [autores_ids];
      }
    }
    if (typeof generos_ids === "string") {
      try {
        generos_ids = JSON.parse(generos_ids);
      } catch (_) {
        generos_ids = [generos_ids];
      }
    }

    const libro = await Libros.create({ titulo, sinopsis, anio_edicion, portada_url, activo: true });

    if (autores_ids && autores_ids.length > 0) await libro.setAutores(autores_ids);
    if (generos_ids && generos_ids.length > 0) await libro.setGeneros(generos_ids);
    if (editorial_id) await libro.setEditoriales([editorial_id]);

    const libroCompleto = await Libros.findByPk(libro.id, {
      include: [
        { model: Autores, as: "autores", through: { attributes: [] } },
        { model: Generos, as: "generos", through: { attributes: [] } },
        { model: Editorial, as: "editoriales", through: { attributes: [] } },
      ],
    });

    emitirCatalogoActualizado({ motivo: "libro_creado", libro_id: libroCompleto?.id });

    return res.status(201).json({ ok: true, mensaje: "Libro creado exitosamente", data: libroCompleto });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const actualizarLibro = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      titulo,
      sinopsis,
      anio_edicion,
      portada_url,
      activo,
      autores_ids,
      generos_ids,
      editorial_id,
    } = req.body;

    const libro = await Libros.findByPk(id);
    if (!libro) return res.status(404).json({ ok: false, mensaje: "Libro no encontrado" });

    // Si viene archivo de portada en la actualización
    if (req.file) {
      const uploadRes = await subirACloudinary(req.file.buffer);
      portada_url = uploadRes.secure_url;
    }

    if (titulo !== undefined) libro.titulo = titulo.trim();
    if (sinopsis !== undefined) libro.sinopsis = sinopsis.trim();
    if (anio_edicion !== undefined) libro.anio_edicion = parseInt(anio_edicion, 10);
    if (portada_url !== undefined) libro.portada_url = portada_url;
    if (activo !== undefined) libro.activo = (activo === true || activo === "true" || activo === 1 || activo === "1");

    await libro.save();

    // Actualización de relaciones N:M o N:1 si se proporcionan en el PATCH / PUT
    if (autores_ids !== undefined) {
      if (typeof autores_ids === "string") {
        try {
          autores_ids = JSON.parse(autores_ids);
        } catch (_) {
          autores_ids = [autores_ids];
        }
      }
      if (Array.isArray(autores_ids)) {
        await libro.setAutores(autores_ids);
      }
    }

    if (generos_ids !== undefined) {
      if (typeof generos_ids === "string") {
        try {
          generos_ids = JSON.parse(generos_ids);
        } catch (_) {
          generos_ids = [generos_ids];
        }
      }
      if (Array.isArray(generos_ids)) {
        await libro.setGeneros(generos_ids);
      }
    }

    if (editorial_id !== undefined) {
      if (editorial_id) {
        await libro.setEditoriales([editorial_id]);
      } else {
        await libro.setEditoriales([]);
      }
    }

    const libroCompleto = await Libros.findByPk(libro.id, {
      include: [
        { model: Autores, as: "autores", through: { attributes: [] } },
        { model: Generos, as: "generos", through: { attributes: [] } },
        { model: Editorial, as: "editoriales", through: { attributes: [] } },
      ],
    });

    emitirCatalogoActualizado({ motivo: "libro_actualizado", libro_id: libroCompleto?.id });

    return res.status(200).json({
      ok: true,
      mensaje: "Información del libro actualizada exitosamente",
      data: libroCompleto,
    });
  } catch (error) {
    console.error("Error al actualizar libro:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

/**
 * Actualizar exclusivamente la portada de un libro mediante subida directa
 */
export const actualizarPortadaLibro = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debe proporcionar una imagen en el campo 'portada'",
      });
    }

    const libro = await Libros.findByPk(id);
    if (!libro) return res.status(404).json({ ok: false, mensaje: "Libro no encontrado" });

    const uploadRes = await subirACloudinary(req.file.buffer);
    libro.portada_url = uploadRes.secure_url;
    await libro.save();
    emitirCatalogoActualizado({ motivo: "portada_actualizada", libro_id: libro.id });

    return res.status(200).json({
      ok: true,
      mensaje: "Portada del libro actualizada exitosamente en Cloudinary",
      data: libro,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const actualizarStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_disponible } = req.body;

    if (stock_disponible === undefined || isNaN(parseInt(stock_disponible, 10))) {
      return res.status(400).json({ ok: false, mensaje: "stock_disponible debe ser un número entero" });
    }

    const producto = await Catalogo_Productos.findByPk(id);
    if (!producto) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });

    producto.stock_disponible = parseInt(stock_disponible, 10);
    await producto.save();
    emitirCatalogoActualizado({ motivo: "producto_actualizado", producto_id: producto.id });

    return res.status(200).json({ ok: true, mensaje: "Stock actualizado", data: producto });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};



export const crearGenero = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ ok: false, mensaje: "Nombre de género requerido" });
    const genero = await Generos.create({ nombre, descripcion });
    emitirCatalogoActualizado({ motivo: "genero_creado" });
    return res.status(201).json({ ok: true, mensaje: "Género creado", data: genero });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

export const crearEditorial = async (req, res) => {
  try {
    const { nombre, email_contacto, sitio_web } = req.body;
    if (!nombre) return res.status(400).json({ ok: false, mensaje: "Nombre de editorial requerido" });
    const editorial = await Editorial.create({ nombre, email_contacto, sitio_web });
    emitirCatalogoActualizado({ motivo: "editorial_creada" });
    return res.status(201).json({ ok: true, mensaje: "Editorial creada", data: editorial });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};
