import { Op } from "sequelize";
import {
  Orden,
  OrdenDetalle,
  Usuario,
  Rol,
  PerfilInstitucional,
  Libros,
  Catalogo_Productos,
  Formatos,
  CotizacionSolicitud,
  CotizacionPropuesta,
} from "../models/index.js";
import { emitirActualizacionReporteria } from "../services/socket.service.js";

/**
 * Calcula todas las métricas comerciales y financieras en vivo
 */
export const calcularMetricasReporteria = async () => {
  // 1. Métricas de Órdenes y Finanzas
  const ordenes = await Orden.findAll({
    include: [
      {
        model: Usuario,
        as: "usuario",
        attributes: ["id", "nombres", "apellidos", "email"],
        include: [{ model: Rol, as: "rol", attributes: ["nombre"] }],
      },
      {
        model: OrdenDetalle,
        as: "detalles",
        include: [
          {
            model: Catalogo_Productos,
            as: "producto",
            include: [{ model: Libros, as: "libro", attributes: ["titulo"] }],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  const totalOrdenes = ordenes.length;
  let totalIngresosBrutos = 0;
  let totalDescuentosVolumen = 0;
  let totalDescuentosInstitucionales = 0;
  let totalImpuestos = 0;
  let totalFacturadoFinal = 0;

  const estadosOrdenes = {
    Pendiente: 0,
    Aprobado: 0,
    Enviado: 0,
    Cancelado: 0,
  };

  for (const ord of ordenes) {
    totalIngresosBrutos += parseFloat(ord.subtotal_base || 0);
    totalDescuentosVolumen += parseFloat(ord.descuento_volumen || 0);
    totalDescuentosInstitucionales += parseFloat(ord.descuento_institucional || 0);
    totalImpuestos += parseFloat(ord.total_impuestos || 0);
    totalFacturadoFinal += parseFloat(ord.total_final || 0);

    if (estadosOrdenes[ord.estado] !== undefined) {
      estadosOrdenes[ord.estado]++;
    }
  }

  const totalDescuentosOtorgados = totalDescuentosVolumen + totalDescuentosInstitucionales;
  const ticketPromedio = totalOrdenes > 0 ? +(totalFacturadoFinal / totalOrdenes).toFixed(2) : 0;

  // 2. Métricas de Cotizaciones B2B
  const cotizaciones = await CotizacionSolicitud.findAll();
  const totalCotizaciones = cotizaciones.length;
  const estadosCotizaciones = {
    Pendiente: 0,
    "En Revisión": 0,
    Cotizada: 0,
    "Aprobada por Cliente": 0,
    "Rechazada por Cliente": 0,
  };

  for (const cot of cotizaciones) {
    if (estadosCotizaciones[cot.estado] !== undefined) {
      estadosCotizaciones[cot.estado]++;
    }
  }

  const cotizacionesAprobadas = estadosCotizaciones["Aprobada por Cliente"];
  const tasaConversionCotizaciones = totalCotizaciones > 0
    ? +((cotizacionesAprobadas / totalCotizaciones) * 100).toFixed(1)
    : 0;

  // 3. Productos y Alertas de Stock Crítico
  const productosBajoStock = await Catalogo_Productos.findAll({
    where: {
      stock_disponible: { [Op.lte]: 20 },
      activo: true,
    },
    include: [
      { model: Formatos, as: "formato", attributes: ["nombre", "codigo"] },
      { model: Libros, as: "libro", attributes: ["titulo", "portada_url"] },
    ],
    order: [["stock_disponible", "ASC"]],
    limit: 10,
  });

  // 4. Últimas 8 órdenes en vivo
  const ultimasOrdenes = ordenes.slice(0, 8).map((ord) => ({
    id: ord.id,
    numero_orden: ord.numero_orden,
    cliente: `${ord.usuario?.nombres} ${ord.usuario?.apellidos}`,
    rol_cliente: ord.usuario?.rol?.nombre,
    subtotal_base: ord.subtotal_base,
    descuento_total: +(parseFloat(ord.descuento_volumen) + parseFloat(ord.descuento_institucional)).toFixed(2),
    total_final: ord.total_final,
    estado: ord.estado,
    fecha: ord.fecha_orden || ord.created_at,
  }));

  return {
    resumen_financiero: {
      total_ingresos_brutos: +totalIngresosBrutos.toFixed(2),
      total_descuento_volumen: +totalDescuentosVolumen.toFixed(2),
      total_descuento_institucional: +totalDescuentosInstitucionales.toFixed(2),
      total_descuentos_otorgados: +totalDescuentosOtorgados.toFixed(2),
      total_impuestos_iva: +totalImpuestos.toFixed(2),
      total_facturado_neto: +totalFacturadoFinal.toFixed(2),
      ticket_promedio: ticketPromedio,
      total_ordenes: totalOrdenes,
    },
    distribucion_ordenes: estadosOrdenes,
    modulo_cotizaciones: {
      total_solicitudes: totalCotizaciones,
      distribucion_estados: estadosCotizaciones,
      tasa_conversion_porcentaje: tasaConversionCotizaciones,
    },
    alertas_inventario: {
      total_productos_bajo_stock: productosBajoStock.length,
      productos: productosBajoStock,
    },
    ultimas_ordenes: ultimasOrdenes,
    timestamp: new Date().toISOString(),
  };
};

/**
 * RF-05 / REQUERIMIENTO ESPECIAL: Endpoint REST para obtener el Dashboard de Reportería
 */
export const obtenerDashboardReporteria = async (req, res) => {
  try {
    const metricas = await calcularMetricasReporteria();
    return res.status(200).json({
      ok: true,
      data: metricas,
    });
  } catch (error) {
    console.error("Error al generar dashboard de reportería:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al generar reporte en tiempo real",
      error: error.message,
    });
  }
};

/**
 * Notificador helper para emitir actualización en vivo por WebSocket
 */
export const refrescarReporteriaEnVivo = async () => {
  try {
    const metricas = await calcularMetricasReporteria();
    emitirActualizacionReporteria(metricas);
    return metricas;
  } catch (error) {
    console.error("Error al refrescar reportería en vivo por WebSocket:", error);
  }
};
