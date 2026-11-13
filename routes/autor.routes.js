import { Router } from "express";
import {
  listarAutores,
  obtenerAutorPorId,
  crearAutor,
  actualizarAutor,
  eliminarAutor,
} from "../controllers/autor.controller.js";
import { verificarToken, autorizarRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Consultas públicas (Visitante, Minorista, Institucional, etc.)
router.get("/", listarAutores);
router.get("/:id", obtenerAutorPorId);

// Operaciones de gestión administrativa (Admin y Asesor)
router.post(
  "/",
  verificarToken,
  autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"),
  crearAutor
);

router.put(
  "/:id",
  verificarToken,
  autorizarRoles("ADMIN", "ADMINISTRADOR"),
  actualizarAutor
);

router.delete(
  "/:id",
  verificarToken,
  autorizarRoles("ADMIN", "ADMINISTRADOR"),
  eliminarAutor
);

export default router;
