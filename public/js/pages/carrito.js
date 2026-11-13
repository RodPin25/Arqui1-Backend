// Carrito (RF-03.1 y RF-03.2). Los descuentos los calcula el Modelo en el
// servidor; esta vista solo muestra la liquidación que devuelve el Controlador.

import { h, mount, icon, money, autoresDe, toast, confirmar } from "../core/dom.js";
import { iniciarPagina, actualizarContadorCarrito } from "../core/layout.js";
import { carritoApi } from "../core/api.js";
import { escucharEvento } from "../core/socket.js";
import { portada, resumenCompra, cargando, errorEstado, vacio, titulo } from "../core/components.js";

const pagina = iniciarPagina({ titulo: "Carrito", roles: ["minorista", "institucional"] });

let ocupadoCarrito = false;

async function accion(tarea, aviso) {
  if (ocupadoCarrito) return;
  ocupadoCarrito = true;
  try {
    await tarea();
    if (aviso) toast(aviso);
  } catch (error) {
    toast(error.message, { error: true });
  } finally {
    ocupadoCarrito = false;
    await cargar(false);
  }
}

function filaItem(item) {
  const prod = item.producto || {};
  const libro = prod.libro || {};
  const url = `/libro.html?id=${encodeURIComponent(prod.id)}`;
  const stock = Number(prod.stock_disponible) || 0;
  return h("div", { class: "cart-item" },
    h("a", { class: "cover-btn", href: url, "aria-label": `Ver ${libro.titulo}` }, portada(libro)),
    h("div", { class: "cart-description" },
      h("h3", {}, h("a", { href: url }, libro.titulo)),
      h("p", {}, [autoresDe(libro), prod.formato?.nombre].filter(Boolean).join(", ")),
      h("small", {}, `ISBN ${prod.isbn}`),
      h("button", {
        class: "remove",
        onclick: () => accion(() => carritoApi.quitar(item.id), "Libro eliminado del carrito"),
      }, icon("trash", 15), "Eliminar")),
    h("div", { class: "quantity" },
      h("button", {
        "aria-label": `Quitar una unidad de ${libro.titulo}`, disabled: item.cantidad <= 1,
        onclick: () => accion(() => carritoApi.cambiar(item.id, item.cantidad - 1)),
      }, "−"),
      h("input", {
        class: "qty-input", type: "number", min: "1", max: String(stock), value: item.cantidad, inputmode: "numeric",
        "aria-label": `Cantidad de ${libro.titulo}`,
        onkeydown: (e) => e.key === "Enter" && (e.preventDefault(), e.target.blur()),
        onchange: (e) => {
          const n = Math.floor(Number(e.target.value));
          if (!n || n < 1) { e.target.value = item.cantidad; return toast("La cantidad mínima es 1.", { error: true }); }
          if (n > stock) { e.target.value = item.cantidad; return toast(`Solo hay ${stock} unidades disponibles.`, { error: true }); }
          accion(() => carritoApi.cambiar(item.id, n));
        },
      }),
      h("button", {
        "aria-label": `Agregar una unidad de ${libro.titulo}`, disabled: item.cantidad >= stock,
        onclick: () => accion(() => carritoApi.cambiar(item.id, item.cantidad + 1)),
      }, "+")),
    h("div", { class: "line-price" },
      h("strong", {}, money(Number(prod.precio_base) * item.cantidad)),
      h("small", {}, `${money(prod.precio_base)} c/u`)));
}

async function cargar(conEstado = true) {
  const { main, rol } = pagina;
  if (conEstado) mount(main, cargando());
  try {
    const { items, liquidacion } = (await carritoApi.obtener()).data;
    actualizarContadorCarrito(liquidacion.total_unidades);
    const encabezado = titulo({
      titulo: "Carrito de compra",
      texto: rol === "institucional"
        ? "Los descuentos por volumen y el 8% institucional se aplican automáticamente."
        : "Los descuentos por volumen se aplican automáticamente.",
    });
    if (!items.length) {
      mount(main, encabezado, vacio({
        titulo: "Tu carrito está vacío", iconName: "bag",
        texto: "Explora el catálogo y agrega los títulos que quieras leer.",
        accion: h("a", { class: "btn", href: "/catalogo.html" }, "Explorar el catálogo"),
      }));
      return;
    }
    mount(main, encabezado,
      h("div", { class: "split-layout" },
        h("div", {},
          h("div", { class: "cart-list" }, items.map(filaItem)),
          h("div", { class: "cart-tools" },
            h("a", { class: "text-link", href: "/catalogo.html" }, icon("back", 15), "Seguir comprando"),
            h("button", {
              class: "text-link danger-link",
              onclick: async () => {
                if (await confirmar({ titulo: "¿Vaciar el carrito?", mensaje: "Se quitarán todos los libros del carrito.", boton: "Vaciar carrito", peligro: true }))
                  accion(() => carritoApi.vaciar(), "Carrito vaciado");
              },
            }, icon("trash", 15), "Vaciar carrito"))),
        h("div", { class: "sticky-col" },
          h("div", { class: "summary-card" },
            resumenCompra(liquidacion, { conImpuestos: true }),
            h("p", { class: "summary-note" }, `${liquidacion.total_unidades} ${liquidacion.total_unidades === 1 ? "unidad" : "unidades"} en el carrito`)),
          h("a", { class: "btn full", href: "/checkout.html" }, "Continuar al pago", icon("arrow", 17)))));
  } catch (error) {
    mount(main, errorEstado(error, cargar));
  }
}

if (pagina) {
  cargar();
  escucharEvento("carrito:actualizado", () => cargar());
}
