// Ficha técnica del libro (RF-01.3).

import { h, mount, icon, money, params, autoresDe, toast } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { catalogoApi } from "../core/api.js";
import { portada, insignia, cargando, errorEstado, vacio } from "../core/components.js";
import { agregarAlCarrito } from "./compartido.js";

const pagina = iniciarPagina({ titulo: "Ficha del libro" });

async function cargar() {
  const { main } = pagina;
  const id = params().get("id");
  if (!id) {
    mount(main, vacio({ titulo: "Libro no encontrado", texto: "El enlace no indica qué libro mostrar.",
      accion: h("a", { class: "btn", href: "/catalogo.html" }, "Ir al catálogo") }));
    return;
  }
  mount(main, cargando());
  try {
    const prod = (await catalogoApi.producto(id)).data;
    const libro = prod.libro || {};
    const variantes = [prod, ...(prod.otras_variantes || [])];
    document.title = `${libro.titulo} | LibroNet`;
    let cantidad = 1;
    const disponible = Number(prod.stock_disponible) || 0;
    const visor = h("span", { "aria-live": "polite" }, "1");
    const menos = h("button", { "aria-label": "Quitar una unidad", disabled: true, onclick: () => fijar(cantidad - 1) }, "−");
    const mas = h("button", { "aria-label": "Agregar una unidad", disabled: disponible <= 1, onclick: () => fijar(cantidad + 1) }, "+");
    const fijar = (n) => {
      cantidad = Math.min(Math.max(1, n), Math.max(1, disponible));
      visor.textContent = cantidad;
      menos.disabled = cantidad <= 1;
      mas.disabled = cantidad >= disponible;
    };

    mount(main,
      h("a", { class: "back", href: "/catalogo.html" }, icon("back", 16), "Volver al catálogo"),
      h("div", { class: "book-detail" },
        h("div", { class: "book-visual" }, portada(libro)),
        h("div", { class: "book-info" },
          h("div", { class: "tag-row" },
            disponible > 0 ? insignia("En existencia", "green") : insignia("Agotado", "red"),
            h("span", {}, (libro.generos || []).map((g) => g.nombre).join(", "))),
          h("h1", {}, libro.titulo),
          h("p", { class: "byline" }, "de ", autoresDe(libro)),
          h("p", { class: "synopsis" }, libro.sinopsis || "Sinopsis no disponible."),

          variantes.length > 1 && h("div", { class: "variant-row", role: "group", "aria-label": "Formatos disponibles" },
            variantes.map((v) => h("a", {
              class: String(v.id) === String(prod.id) ? "variant active" : "variant",
              href: `/libro.html?id=${encodeURIComponent(v.id)}`,
              "aria-current": String(v.id) === String(prod.id) ? "true" : null,
            }, h("b", {}, v.formato?.nombre), h("span", {}, money(v.precio_base))))),

          h("div", { class: "purchase-box" },
            h("div", {}, h("strong", {}, money(prod.precio_base)), h("span", {}, "por unidad; descuentos e IVA se calculan en el carrito")),
            h("div", { class: "quantity" }, menos, visor, mas),
            h("button", {
              class: "btn", disabled: disponible <= 0,
              onclick: (e) => agregarAlCarrito(prod, e.currentTarget, cantidad),
            }, icon("bag", 18), disponible > 0 ? "Agregar al carrito" : "Sin existencias")),

          h("section", { class: "detail-tables single" },
            h("h2", {}, "Ficha bibliográfica"),
            h("table", { class: "spec-table" },
              h("tbody", {},
                fila("Autor", autoresDe(libro)),
                fila("Editorial", (libro.editoriales || []).map((e) => e.nombre).join(", ")),
                fila("ISBN", prod.isbn),
                fila("Año de edición", libro.anio_edicion),
                fila("Formato", prod.formato?.nombre),
                fila("Género", (libro.generos || []).map((g) => g.nombre).join(", ")),
                fila("Stock disponible", `${disponible} ${disponible === 1 ? "unidad" : "unidades"}`),
                fila("Precio base", money(prod.precio_base))))))));
  } catch (error) {
    if (error.status === 404) {
      mount(main, vacio({ titulo: "Libro no encontrado", texto: "Puede que ya no esté disponible en el catálogo.",
        accion: h("a", { class: "btn", href: "/catalogo.html" }, "Ir al catálogo") }));
    } else {
      mount(main, errorEstado(error, cargar));
      toast(error.message, { error: true });
    }
  }
}

const fila = (etiqueta, valor) => h("tr", {}, h("th", {}, etiqueta), h("td", {}, valor ?? "No registrado"));

if (pagina) cargar();
