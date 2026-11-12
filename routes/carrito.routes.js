import { Router } from "express";
import {
  obtenerCarrito,
  agregarAlCarrito,
  actualizarCantidadItem,
  eliminarItemCarrito,
  vaciarCarrito,
} from "../controllers/carrito.controller.js";
import { verificarToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las operaciones de carrito requieren autenticación de cliente (Minorista o Institucional)
router.use(verificarToken);

router.get("/", obtenerCarrito);
router.post("/items", agregarAlCarrito);
router.put("/items/:itemId", actualizarCantidadItem);
router.delete("/items/:itemId", eliminarItemCarrito);
router.delete("/", vaciarCarrito);

export default router;