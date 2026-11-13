import {
  CotizacionSolicitud,
  CotizacionPropuesta,
  Usuario,
  Libros,
  Rol,
  PerfilInstitucional,
} from "../models/index.js";
import {
  emitirNuevaSolicitudCotizacion,
  emitirActualizacionCotizacion,
} from "../services/socket.service.js";

const generarCodigoSolicitud = () => {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `COT-${hoy}-${randomStr}`;
};

/**
 * RF-04.1 y RF-04.2 Crear una nueva solicitud de cotización personalizada
 * Exclusivo para Clientes Institucionales / Mayoristas
 */
export const crearSolicitudCotizacion = async (req, res) => {
  try {
    const clienteId = req.usuario.id;
    const {
      titulo_obra,
      cantidad_estimada,
      acabado_portada,
      tipo_papel,
      fecha_entrega_requerida,
      notas_cliente,
      libro_id,
    } = req.body;

    if (!titulo_obra || !cantidad_estimada || !acabado_portada || !tipo_papel || !fecha_entrega_requerida) {
      return res.status(400).json({
        ok: false,
        mensaje: "titulo_obra, cantidad_estimada, acabado_portada, tipo_papel y fecha_entrega_requerida son requeridos",
      });
    }

    const cantidad = parseInt(cantidad_estimada, 10);
    if (isNaN(cantidad) || cantidad <= 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "La cantidad estimada debe ser un número entero mayor a 0",
      });
    }

    const nuevaSolicitud = await CotizacionSolicitud.create({
      codigo_solicitud: generarCodigoSolicitud(),
      cliente_id: clienteId,
      libro_id: libro_id || null,
      titulo_obra: titulo_obra.trim(),
      cantidad_estimada: cantidad,
      acabado_portada: acabado_portada.trim(),
      tipo_papel: tipo_papel.trim(),
      fecha_entrega_requerida,
      notas_cliente: notas_cliente ? notas_cliente.trim() : null,
      estado: "Pendiente",
    });

    const solicitudCompleta = await CotizacionSolicitud.findByPk(nuevaSolicitud.id, {
      include: [
        { model: Usuario, as: "cliente", attributes: ["id", "nombres", "apellidos", "email"] },
        { model: Libros, as: "libro", attributes: ["id", "titulo"] },
      ],
    });

    emitirNuevaSolicitudCotizacion(solicitudCompleta);

    return res.status(201).json({
      ok: true,
      mensaje: "Solicitud de cotización creada exitosamente",
      data: solicitudCompleta,
    });
  } catch (error) {
    console.error("Error al crear cotización:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al crear solicitud de cotización",
      error: error.message,
    });
  }
};

/**
 * RF-04.3 Listar las solicitudes del cliente institucional autenticado
 */
export const misSolicitudesCotizacion = async (req, res) => {
  try {
    const clienteId = req.usuario.id;

    const solicitudes = await CotizacionSolicitud.findAll({
      where: { cliente_id: clienteId },
      include: [
        { model: Libros, as: "libro", attributes: ["id", "titulo", "portada_url"] },
        { model: Usuario, as: "asesor", attributes: ["id", "nombres", "apellidos", "email"] },
        { model: CotizacionPropuesta, as: "propuestas" },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      ok: true,
      total: solicitudes.length,
      data: solicitudes,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener solicitudes de cotización",
      error: error.message,
    });
  }
};

/**
 * RF-05.3 Bandeja comercial de cotizaciones para Asesores y Administradores
 */
export const listarBandejaCotizaciones = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const solicitudes = await CotizacionSolicitud.findAll({
      where,
      include: [
        {
          model: Usuario,
          as: "cliente",
          attributes: ["id", "nombres", "apellidos", "email", "telefono"],
          include: [{ model: PerfilInstitucional, as: "perfil_institucional" }],
        },
        { model: Libros, as: "libro", attributes: ["id", "titulo", "portada_url"] },
        { model: Usuario, as: "asesor", attributes: ["id", "nombres", "apellidos", "email"] },
        { model: CotizacionPropuesta, as: "propuestas" },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      ok: true,
      total: solicitudes.length,
      data: solicitudes,
    });
  } catch (error) {
    console.error("Error al listar bandeja:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error al listar bandeja de cotizaciones",
      error: error.message,
    });
  }
};

/**
 * RF-05.3 Asignar asesor a una solicitud
 */
export const asignarAsesor = async (req, res) => {
  try {
    const { id } = req.params;
    const asesorId = req.usuario.id;

    const solicitud = await CotizacionSolicitud.findByPk(id);
    if (!solicitud) {
      return res.status(404).json({ ok: false, mensaje: "Solicitud no encontrada" });
    }

    solicitud.asesor_id = asesorId;
    if (solicitud.estado === "Pendiente") {
      solicitud.estado = "En Revisión";
    }
    await solicitud.save();
    emitirActualizacionCotizacion(solicitud, "asignada");

    return res.status(200).json({
      ok: true,
      mensaje: "Asesor asignado correctamente a la solicitud",
      data: solicitud,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al asignar asesor",
      error: error.message,
    });
  }
};

/**
 * RF-04.3 y RF-05.3 Emitir propuesta formal de cotización digital
 */
export const emitirPropuestaCotizacion = async (req, res) => {
  try {
    const asesorId = req.usuario.id;
    const { id } = req.params; // ID de la solicitud
    const {
      costo_unitario_ofrecido,
      costo_total_propuesto,
      tiempo_entrega_dias,
      condiciones_comerciales,
      fecha_validez,
    } = req.body;

    if (!costo_unitario_ofrecido || !costo_total_propuesto || !tiempo_entrega_dias || !fecha_validez) {
      return res.status(400).json({
        ok: false,
        mensaje: "costo_unitario_ofrecido, costo_total_propuesto, tiempo_entrega_dias y fecha_validez son obligatorios",
      });
    }

    const solicitud = await CotizacionSolicitud.findByPk(id);
    if (!solicitud) {
      return res.status(404).json({ ok: false, mensaje: "Solicitud no encontrada" });
    }

    // Crear la propuesta formal
    const propuesta = await CotizacionPropuesta.create({
      solicitud_id: solicitud.id,
      asesor_id: asesorId,
      costo_unitario_ofrecido: parseFloat(costo_unitario_ofrecido),
      costo_total_propuesto: parseFloat(costo_total_propuesto),
      tiempo_entrega_dias: parseInt(tiempo_entrega_dias, 10),
      condiciones_comerciales: condiciones_comerciales ? condiciones_comerciales.trim() : null,
      fecha_validez,
      estado: "Emitida",
    });

    // Actualizar estado de la solicitud
    solicitud.estado = "Cotizada";
    solicitud.asesor_id = asesorId;
    await solicitud.save();
    emitirActualizacionCotizacion(solicitud, "propuesta_emitida");

    return res.status(201).json({
      ok: true,
      mensaje: "Propuesta de cotización emitida con éxito",
      data: propuesta,
    });
  } catch (error) {
    console.error("Error al emitir propuesta:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al emitir propuesta",
      error: error.message,
    });
  }
};

/**
 * RF-04.3 El cliente institucional aprueba o rechaza la propuesta formal
 */
export const responderPropuestaCliente = async (req, res) => {
  try {
    const clienteId = req.usuario.id;
    const { id } = req.params; // ID de la solicitud
    const { accion } = req.body; // 'aprobar' o 'rechazar'

    if (!["aprobar", "rechazar"].includes(accion)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Acción inválida. Debe ser 'aprobar' o 'rechazar'",
      });
    }

    const solicitud = await CotizacionSolicitud.findOne({
      where: { id, cliente_id: clienteId },
      include: [{ model: CotizacionPropuesta, as: "propuestas" }],
    });

    if (!solicitud) {
      return res.status(404).json({ ok: false, mensaje: "Solicitud no encontrada o no pertenece al cliente" });
    }

    if (solicitud.estado !== "Cotizada") {
      return res.status(400).json({
        ok: false,
        mensaje: `No puede responder una solicitud con estado '${solicitud.estado}'`,
      });
    }

    const ultimaPropuesta = solicitud.propuestas && solicitud.propuestas.length > 0
      ? solicitud.propuestas[solicitud.propuestas.length - 1]
      : null;

    if (accion === "aprobar") {
      solicitud.estado = "Aprobada por Cliente";
      if (ultimaPropuesta) {
        ultimaPropuesta.estado = "Aceptada";
        await ultimaPropuesta.save();
      }
    } else {
      solicitud.estado = "Rechazada por Cliente";
      if (ultimaPropuesta) {
        ultimaPropuesta.estado = "Cancelada";
        await ultimaPropuesta.save();
      }
    }

    await solicitud.save();
    emitirActualizacionCotizacion(solicitud, accion === "aprobar" ? "aprobada" : "rechazada");

    return res.status(200).json({
      ok: true,
      mensaje: `Cotización ${accion === "aprobar" ? "aprobada" : "rechazada"} por el cliente`,
      data: solicitud,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al procesar respuesta a la cotización",
      error: error.message,
    });
  }
};
