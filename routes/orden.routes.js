import { Router } from "express";
import {
  crearOrden,
  misOrdenes,
  obtenerOrdenPorId,
  listarTodasLasOrdenes,
  actualizarEstadoOrden,
} from "../controllers/orden.controller.js";
import { verificarToken, autorizarRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas de órdenes requieren autenticación
router.use(verificarToken);

// Rutas para clientes
router.post("/checkout", crearOrden);
router.get("/mis-ordenes", misOrdenes);

// Monitoreo comercial y administrativo (Admin y Asesor)
router.get("/", autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"), listarTodasLasOrdenes);
router.patch("/:id/estado", autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"), actualizarEstadoOrden);

// Detalle de orden por ID (accesible por el dueño o staff)
router.get("/:id", obtenerOrdenPorId);

export default router;