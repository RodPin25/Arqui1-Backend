// Catálogo (RF-01.2): búsqueda en tiempo real y filtros combinables.
// Los filtros viajan como parámetros al Controlador; la Vista no filtra datos.

import { h, mount, icon, money, debounce, params } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { catalogoApi } from "../core/api.js";
import { tarjetaLibro, cargando, errorEstado, vacio, titulo, paginacion } from "../core/components.js";
import { agregarAlCarrito } from "./compartido.js";

const pagina = iniciarPagina({ titulo: "Catálogo" });
const ORDENES = [["recientes", "Más recientes"], ["precio_asc", "Precio: menor a mayor"], ["precio_desc", "Precio: mayor a menor"]];

const inicial = params();
const estado = {
  q: inicial.get("q") || "",
  genero_id: inicial.get("genero_id") || "",
  formato_id: inicial.get("formato_id") || "",
  min_precio: inicial.get("min_precio") || "",
  max_precio: inicial.get("max_precio") || "",
  en_stock: inicial.get("en_stock") === "true",
  orden: inicial.get("orden") || "recientes",
  page: Number(inicial.get("page")) || 1,
};

let generos = [];
let formatos = [];
let peticion = 0;

const resultados = h("div", { class: "catalog-results" });
const filtros = h("aside", { class: "filters", "aria-label": "Filtros" });

function sincronizarUrl() {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(estado)) {
    if (v && !(k === "orden" && v === "recientes") && !(k === "page" && v === 1)) q.set(k, v);
  }
  history.replaceState(null, "", q.toString() ? `?${q}` : location.pathname);
}

function cambiar(cambios) {
  Object.assign(estado, cambios, "page" in cambios ? {} : { page: 1 });
  sincronizarUrl();
  pintarFiltros();
  buscar();
}

function limpiar() {
  const global = document.getElementById("busqueda-global");
  if (global) global.value = "";
  cambiar({ q: "", genero_id: "", formato_id: "", min_precio: "", max_precio: "", en_stock: false });
}

function pintarFiltros() {
  const precioInvalido = estado.min_precio && estado.max_precio && Number(estado.min_precio) > Number(estado.max_precio);
  mount(filtros,
    h("div", { class: "filter-head" }, h("h3", {}, "Filtrar por"), h("button", { onclick: limpiar }, "Limpiar")),
    h("label", { class: "filter-group" }, h("b", {}, "Género"),
      h("select", { onchange: (e) => cambiar({ genero_id: e.target.value }) },
        h("option", { value: "" }, "Todos"),
        generos.map((g) => h("option", { value: g.id, selected: String(g.id) === estado.genero_id }, g.nombre)))),
    h("fieldset", { class: "filter-group" }, h("legend", {}, "Formato"),
      [{ id: "", nombre: "Todos" }, ...formatos].map((f) =>
        h("label", { class: "check" },
          h("input", { type: "radio", name: "formato", checked: String(f.id) === estado.formato_id, onchange: () => cambiar({ formato_id: String(f.id) }) }),
          h("span", {}, f.nombre)))),
    h("div", { class: "filter-group" }, h("b", {}, "Precio (Q)"),
      h("div", { class: "price-range" },
        h("input", { type: "number", min: "0", step: "1", inputmode: "decimal", placeholder: "Mínimo", "aria-label": "Precio mínimo", value: estado.min_precio,
          onchange: (e) => cambiar({ min_precio: e.target.value }) }),
        h("span", { "aria-hidden": "true" }, "a"),
        h("input", { type: "number", min: "0", step: "1", inputmode: "decimal", placeholder: "Máximo", "aria-label": "Precio máximo", value: estado.max_precio,
          "aria-invalid": precioInvalido ? "true" : null, onchange: (e) => cambiar({ max_precio: e.target.value }) })),
      precioInvalido && h("small", { class: "error-text" }, "El mínimo no puede ser mayor que el máximo.")),
    h("div", { class: "filter-group" }, h("b", {}, "Disponibilidad"),
      h("label", { class: "check" },
        h("input", { type: "checkbox", checked: estado.en_stock, onchange: (e) => cambiar({ en_stock: e.target.checked }) }),
        h("span", {}, "Solo en existencia"))));
}

function chips() {
  const lista = [];
  const quitar = (texto, cambios) =>
    lista.push(h("button", { onclick: () => { if ("q" in cambios) document.getElementById("busqueda-global").value = ""; cambiar(cambios); } }, texto, icon("close", 13)));
  if (estado.q) quitar(`“${estado.q}”`, { q: "" });
  const g = generos.find((x) => String(x.id) === estado.genero_id);
  if (g) quitar(g.nombre, { genero_id: "" });
  const f = formatos.find((x) => String(x.id) === estado.formato_id);
  if (f) quitar(f.nombre, { formato_id: "" });
  if (estado.min_precio) quitar(`Desde ${money(estado.min_precio)}`, { min_precio: "" });
  if (estado.max_precio) quitar(`Hasta ${money(estado.max_precio)}`, { max_precio: "" });
  if (estado.en_stock) quitar("En existencia", { en_stock: false });
  return lista;
}

async function buscar() {
  const id = ++peticion;
  resultados.setAttribute("aria-busy", "true");
  if (!resultados.firstChild) mount(resultados, cargando("Buscando libros"));
  try {
    const { data, pagination } = await catalogoApi.listar({
      ...estado, en_stock: estado.en_stock ? "true" : "", limit: 12,
    });
    if (id !== peticion) return;
    mount(resultados,
      h("div", { class: "results-top" },
        h("div", { class: "active-filters" },
          h("span", { class: "result-count", "aria-live": "polite" }, `${pagination.total} ${pagination.total === 1 ? "resultado" : "resultados"}`),
          chips()),
        h("label", { class: "sort" }, "Ordenar por",
          h("select", { onchange: (e) => cambiar({ orden: e.target.value }) },
            ORDENES.map(([v, t]) => h("option", { value: v, selected: v === estado.orden }, t))))),
      data.length
        ? [h("div", { class: "book-grid three" }, data.map((p) => tarjetaLibro(p, { alAgregar: agregarAlCarrito }))),
          paginacion(pagination, (n) => { cambiar({ page: n }); scrollTo({ top: 0 }); })]
        : vacio({
            titulo: "No encontramos coincidencias",
            texto: "Prueba con otros términos o quita algunos filtros.",
            accion: h("button", { class: "btn", onclick: limpiar }, "Limpiar búsqueda"),
          }));
  } catch (error) {
    if (id === peticion) mount(resultados, errorEstado(error, buscar));
  } finally {
    if (id === peticion) resultados.removeAttribute("aria-busy");
  }
}

async function cargar() {
  const { main } = pagina;
  const botonFiltros = h("button", {
    class: "filter-mobile btn ghost", "aria-expanded": "false",
    onclick: () => {
      filtros.classList.toggle("open");
      botonFiltros.setAttribute("aria-expanded", String(filtros.classList.contains("open")));
    },
  }, icon("filter", 17), "Filtros y orden");
  mount(main,
    titulo({ titulo: "Encuentra tu próxima lectura", texto: "Busca por título, autor o ISBN y combina filtros por género, formato y precio." }),
    botonFiltros,
    h("div", { class: "catalog-layout" }, filtros, resultados));

  const global = document.getElementById("busqueda-global");
  global?.addEventListener("input", debounce(() => cambiar({ q: global.value.trim() }), 300));

  pintarFiltros();
  buscar();
  try {
    const [g, f] = await Promise.all([catalogoApi.generos(), catalogoApi.formatos()]);
    generos = g.data;
    formatos = f.data;
    pintarFiltros();
  } catch {
    /* los filtros quedan vacíos; la búsqueda sigue funcionando */
  }
}

if (pagina) cargar();
