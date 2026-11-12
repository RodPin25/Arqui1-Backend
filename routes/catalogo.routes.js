import { Router } from "express";
import {
  listarProductos,
  obtenerProductoPorId,
  obtenerLanding,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  listarGeneros,
  listarFormatos,
  listarAutores,
  listarEditoriales,
  crearLibro,
  crearAutor,
  crearGenero,
  crearEditorial,
} from "../controllers/catalogo.controller.js";
import { verificarToken, autorizarRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// RF-01.1 Portada / Landing
router.get("/landing", obtenerLanding);

// Metadatos para filtros y selectores del frontend (deben ir antes de /:id)
router.get("/generos", listarGeneros);
router.get("/formatos", listarFormatos);
router.get("/autores", listarAutores);
router.get("/editoriales", listarEditoriales);

// Catálogo público
router.get("/", listarProductos);
router.get("/:id", obtenerProductoPorId);

// Gestión administrativa del catálogo (Admin)
router.post("/", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearProducto);
router.put("/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), actualizarProducto);
router.delete("/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), eliminarProducto);

// CRUD de Entidades Base del Catálogo (Admin)
router.post("/libros", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearLibro);
router.post("/autores", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearAutor);
router.post("/generos", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearGenero);
router.post("/editoriales", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearEditorial);

export default router;
