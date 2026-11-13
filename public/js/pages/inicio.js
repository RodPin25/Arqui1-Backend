// Vista principal (RF-01.1): destacados, novedades y banners promocionales.

import { h, mount, toast } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { catalogoApi } from "../core/api.js";
import { estante, tarjetaLibro, cargando, errorEstado } from "../core/components.js";
import { agregarAlCarrito } from "./compartido.js";

const pagina = iniciarPagina({ completa: true, titulo: "Inicio" });

async function cargar() {
  const { main, rol } = pagina;
  mount(main, h("div", { class: "main" }, cargando()));
  try {
    const { destacados = [], novedades = [], banners = [] } = (await catalogoApi.landing()).data;
    const [principal, ...otros] = banners;
    const unicos = (lista) => lista.filter((p, i) => lista.findIndex((x) => x.libro_id === p.libro_id) === i);
    mount(main,
      h("section", { class: "hero" },
        h("div", { class: "hero-copy" },
          h("h1", {}, principal?.titulo || "Libros para leer de uno en uno o comprar por miles."),
          h("p", {}, principal?.subtitulo || "Historias, ideas y saberes para lectores, librerías e instituciones."),
          h("div", { class: "button-row" },
            h("a", { class: "btn on-dark", href: "/catalogo.html" }, "Explorar catálogo"),
            h("a", { class: "btn ghost-dark", href: rol === "institucional" ? "/solicitud.html" : "/login.html?registro=institucional" },
              rol === "institucional" ? "Solicitar edición especial" : "Soluciones institucionales"))),
        estante([...novedades, ...destacados])),

      h("section", { class: "content-section" },
        h("div", { class: "section-row" },
          h("div", {}, h("h2", {}, "Novedades del mes"), h("p", {}, "Recién llegados al catálogo.")),
          h("a", { class: "text-link", href: "/catalogo.html?orden=recientes" }, "Ver todo el catálogo")),
        h("div", { class: "book-grid" }, unicos(novedades).slice(0, 4).map((p) => tarjetaLibro(p, { alAgregar: agregarAlCarrito })))),

      otros.length > 0 && h("section", { class: "promo-band" },
        otros.map((b, i) =>
          h("div", { class: "promo-copy" },
            h("h2", {}, b.titulo),
            h("p", {}, b.subtitulo),
            h("a", { class: i === 0 ? "btn" : "btn ghost", href: i === 0 ? "/catalogo.html" : "/solicitud.html" },
              i === 0 ? "Ver colección" : "Solicitar cotización")))),

      h("section", { class: "content-section" },
        h("div", { class: "section-row" },
          h("div", {}, h("h2", {}, "Lecturas destacadas"), h("p", {}, "La selección de nuestro equipo editorial."))),
        h("div", { class: "book-grid" }, unicos(destacados).slice(0, 4).map((p) => tarjetaLibro(p, { alAgregar: agregarAlCarrito })))));
  } catch (error) {
    mount(main, h("div", { class: "main" }, errorEstado(error, cargar)));
    toast("No se pudo cargar la portada", { error: true });
  }
}

if (pagina) cargar();
