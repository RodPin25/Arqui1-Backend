// Vista principal (RF-01.1): destacados, novedades y banners promocionales.

import { h, mount, icon, toast } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { catalogoApi } from "../core/api.js";
import { escucharEvento } from "../core/socket.js";
import { estante, tarjetaLibro, cargando, errorEstado } from "../core/components.js";
import { FRASES } from "../core/frases.js";
import { agregarAlCarrito } from "./compartido.js";

const pagina = iniciarPagina({ completa: true, titulo: "Inicio" });
const INTERVALO = 8000;
let temporizador = null;

/** Frases que cambian solas; se detienen al pasar el mouse, al enfocar o con el botón de pausa. */
function frasesRotativas() {
  let actual = Math.floor(Math.random() * FRASES.length);
  let pausada = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let encima = false;

  const items = FRASES.map((f, i) =>
    h("figure", { class: "quote-item", "aria-hidden": "true" },
      h("blockquote", {}, h("p", {}, f.texto)),
      h("figcaption", {}, h("b", {}, f.autor), h("span", {}, f.nota))));
  const puntos = FRASES.map((f, i) =>
    h("button", { type: "button", class: "quote-dot", "aria-label": `Frase ${i + 1} de ${FRASES.length}: ${f.autor}`, onclick: () => mostrar(i) }));
  const pausa = h("button", { type: "button", class: "quote-pause", onclick: () => { pausada = !pausada; reiniciar(); pintarPausa(); } });

  function pintarPausa() {
    mount(pausa, icon(pausada ? "play" : "pause", 14));
    pausa.setAttribute("aria-label", pausada ? "Reanudar frases" : "Pausar frases");
  }
  function mostrar(i) {
    actual = (i + FRASES.length) % FRASES.length;
    items.forEach((el, j) => { el.classList.toggle("active", j === actual); el.setAttribute("aria-hidden", String(j !== actual)); });
    puntos.forEach((el, j) => el.setAttribute("aria-current", String(j === actual)));
    reiniciar();
  }
  function reiniciar() {
    clearInterval(temporizador);
    if (!pausada && !encima) temporizador = setInterval(() => mostrar(actual + 1), INTERVALO);
  }

  const caja = h("div", {
    class: "quote-rotator", role: "region", "aria-roledescription": "carrusel", "aria-label": "Frases de autores guatemaltecos",
    onmouseenter: () => { encima = true; reiniciar(); },
    onmouseleave: () => { encima = false; reiniciar(); },
    onfocusin: () => { encima = true; reiniciar(); },
    onfocusout: () => { encima = false; reiniciar(); },
  },
  h("div", { class: "quote-stack" }, items),
  h("div", { class: "quote-controls" }, pausa, h("div", { class: "quote-dots" }, puntos)));

  pintarPausa();
  mostrar(actual);
  return caja;
}

/** Todo el catálogo para el estante, de 100 en 100, un lomo por libro en orden alfabético. */
async function catalogoCompleto() {
  const todos = [];
  for (let page = 1; page <= 20; page++) {
    const { data, pagination } = await catalogoApi.listar({ limit: 100, page });
    todos.push(...data);
    if (!pagination || page >= pagination.totalPages) break;
  }
  return todos.sort((a, b) => (a.libro?.titulo || "").localeCompare(b.libro?.titulo || "", "es"));
}

async function cargar() {
  const { main, rol } = pagina;
  mount(main, h("div", { class: "main" }, cargando()));
  try {
    const [landing, catalogo] = await Promise.all([catalogoApi.landing(), catalogoCompleto().catch(() => [])]);
    const { destacados = [], novedades = [], banners = [] } = landing.data;
    const [principal, ...otros] = banners;
    const unicos = (lista) => lista.filter((p, i) => lista.findIndex((x) => x.libro_id === p.libro_id) === i);
    mount(main,
      h("section", { class: "hero" },
        h("div", { class: "hero-copy" },
          h("h1", { class: "sr-only" }, "LibroNet, plataforma editorial"),
          frasesRotativas(),
          h("p", { class: "hero-promo" }, principal?.subtitulo || "Historias, ideas y saberes para lectores, librerías e instituciones."),
          h("div", { class: "button-row" },
            h("a", { class: "btn on-dark", href: "/catalogo.html" }, "Explorar catálogo"),
            h("a", { class: "btn ghost-dark", href: rol === "institucional" ? "/solicitud.html" : "/login.html?registro=institucional" },
              rol === "institucional" ? "Solicitar edición especial" : "Soluciones institucionales"))),
        estante(catalogo.length ? catalogo : [...novedades, ...destacados])),

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

if (pagina) {
  cargar();
  escucharEvento("catalogo:actualizado", () => cargar(), { permitirAnonimo: true });
}
