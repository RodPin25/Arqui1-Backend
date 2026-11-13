// Acciones que comparten varias vistas de la tienda.

import { toast, ocupado } from "../core/dom.js";
import { carritoApi } from "../core/api.js";
import { rolDe, esCliente, irALogin } from "../core/session.js";
import { actualizarContadorCarrito } from "../core/layout.js";

/** Agrega un producto al carrito o pide iniciar sesión si es un visitante. */
export async function agregarAlCarrito(producto, boton, cantidad = 1) {
  const rol = rolDe();
  if (rol === "visitante") return irALogin("Inicia sesión o crea una cuenta para comprar. Tu búsqueda seguirá aquí.");
  if (!esCliente(rol)) return toast("Solo las cuentas de cliente pueden comprar.", { error: true });
  const tarea = async () => {
    try {
      await carritoApi.agregar(producto.id, cantidad);
      await actualizarContadorCarrito();
      toast(cantidad > 1 ? `${cantidad} unidades agregadas al carrito` : "Libro agregado al carrito",
        { accion: { texto: "Ver carrito", onclick: () => (location.href = "/carrito.html") } });
    } catch (error) {
      toast(error.message, { error: true });
    }
  };
  return boton ? ocupado(boton, tarea) : tarea();
}
