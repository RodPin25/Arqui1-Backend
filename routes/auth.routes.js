import { Router } from "express";
import {
  registrar,
  login,
  refrescarToken,
  obtenerPerfil,
  listarUsuarios,
  actualizarUsuario,
  listarPerfilesInstitucionales,
  verificarPerfilInstitucional,
} from "../controllers/auth.controller.js";
import { verificarToken, autorizarRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas
router.post("/register", registrar);
router.post("/login", login);
router.post("/refresh", refrescarToken);

// Rutas protegidas generales
router.get("/me", verificarToken, obtenerPerfil);

// Gestión de perfiles institucionales (Asesores y Administradores)
router.get(
  "/institucionales",
  verificarToken,
  autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"),
  listarPerfilesInstitucionales
);
router.patch(
  "/institucionales/:usuario_id/verificar",
  verificarToken,
  autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"),
  verificarPerfilInstitucional
);

// Gestión de usuarios del sistema (Exclusivo Administrador)
router.get("/usuarios", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), listarUsuarios);
router.patch("/usuarios/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), actualizarUsuario);

export default router;
