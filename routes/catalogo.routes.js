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
  obtenerAutorPorId,
  crearAutor,
  actualizarAutor,
  eliminarAutor,
  listarEditoriales,
  crearLibro,
  actualizarLibro,
  actualizarPortadaLibro,
  subirPortadaLibro,
  actualizarStock,
  crearGenero,
  crearEditorial,
} from "../controllers/catalogo.controller.js";
import { verificarToken, autorizarRoles } from "../middlewares/auth.middleware.js";
import { uploadPortada } from "../middlewares/upload.middleware.js";

const router = Router();

// RF-01.1 Portada / Landing
router.get("/landing", obtenerLanding);

// Metadatos para filtros y selectores del frontend (deben ir antes de /:id)
router.get("/generos", listarGeneros);
router.get("/formatos", listarFormatos);
router.get("/autores", listarAutores);
router.get("/autores/:id", obtenerAutorPorId);
router.get("/editoriales", listarEditoriales);

// Catálogo público
router.get("/", listarProductos);
router.get("/:id", obtenerProductoPorId);

// Gestión administrativa del catálogo (Admin)
router.post("/", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearProducto);
router.put("/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), actualizarProducto);
router.delete("/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), eliminarProducto);

// Subida de portadas e imágenes a Cloudinary (Admin)
router.post("/subir-portada", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), uploadPortada, subirPortadaLibro);

// CRUD de Entidades Base del Catálogo (Admin)
router.patch("/:id/stock", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), actualizarStock);
router.post("/libros", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), uploadPortada, crearLibro);
router.put("/libros/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), uploadPortada, actualizarLibro);
router.patch("/libros/:id/portada", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), uploadPortada, actualizarPortadaLibro);
router.post("/autores", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR", "ASESOR", "ASESOR_VENTAS"), crearAutor);
router.put("/autores/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), actualizarAutor);
router.delete("/autores/:id", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), eliminarAutor);
router.post("/generos", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearGenero);
router.post("/editoriales", verificarToken, autorizarRoles("ADMIN", "ADMINISTRADOR"), crearEditorial);

export default router;
