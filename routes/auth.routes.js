import { Router } from "express";
import {
  registrar,
  login,
  refrescarToken,
  obtenerPerfil,
} from "../controllers/auth.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas
router.post("/register", registrar);
router.post("/login", login);
router.post("/refresh", refrescarToken);

// Rutas protegidas
router.get("/me", verificarToken, obtenerPerfil);

export default router;
