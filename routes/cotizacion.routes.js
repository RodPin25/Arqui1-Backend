import { Router } from "express";
import {
  crearSolicitudCotizacion,
  misSolicitudesCotizacion,
  listarBandejaCotizaciones,
  asignarAsesor,
  emitirPropuestaCotizacion,
  responderPropuestaCliente,
} from "../controllers/cotizacion.controller.js";
import { verificarToken, autorizarRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las operaciones de cotización requieren autenticación
router.use(verificarToken);

// Clientes Institucionales / Mayoristas
router.post(
  "/solicitar",
  autorizarRoles("CLIENTE_INSTITUCIONAL", "MAYORISTA", "ADMIN", "ADMINISTRADOR"),
  crearSolicitudCotizacion
);
router.get("/mis-solicitudes", misSolicitudesCotizacion);
router.post("/solicitudes/:id/responder", responderPropuestaCliente);

// Asesores y Administradores (RF-05.3 Panel Comercial)
router.get(
  "/bandeja",
  autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"),
  listarBandejaCotizaciones
);
router.patch(
  "/solicitudes/:id/asignar",
  autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"),
  asignarAsesor
);
router.post(
  "/solicitudes/:id/propuesta",
  autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"),
  emitirPropuestaCotizacion
);

export default router;