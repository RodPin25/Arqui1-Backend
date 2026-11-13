import { Router } from "express";
import { obtenerDashboardReporteria } from "../controllers/reportes.controller.js";
import { verificarToken, autorizarRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Exclusivo para Asesores Comerciales y Administradores
router.use(verificarToken);
router.use(autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"));

// Dashboard general de métricas en vivo
router.get("/dashboard", obtenerDashboardReporteria);

export default router;