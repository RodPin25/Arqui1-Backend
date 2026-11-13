import { Router } from "express";
import {
  iniciarCheckout,
  obtenerEstadoCheckout,
  cancelarCheckout,
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

// Flujo de Ventas con Temporizador de 10 Minutos e Idempotencia
router.post("/iniciar-checkout", iniciarCheckout);
router.get("/checkout-sesion", obtenerEstadoCheckout);
router.post("/cancelar-checkout", cancelarCheckout);
router.post("/confirmar-checkout", crearOrden);
router.post("/checkout", crearOrden); // Alias para confirmar checkout

// Historial para clientes
router.get("/mis-ordenes", misOrdenes);

// Monitoreo comercial y administrativo (Admin y Asesor)
router.get("/", autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"), listarTodasLasOrdenes);
router.patch("/:id/estado", autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"), actualizarEstadoOrden);

// Detalle de orden por ID (accesible por el dueño o staff)
router.get("/:id", obtenerOrdenPorId);

export default router;