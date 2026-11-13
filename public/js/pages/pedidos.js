// Historial de pedidos del cliente (RF-02, cliente minorista e institucional).

import { h, mount, icon, money, fecha, sinAcentos, modal } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { ordenesApi } from "../core/api.js";
import { insignia, cargando, errorEstado, vacio, titulo } from "../core/components.js";
import { detalleOrden, ESTADOS_ORDEN } from "./orden-detalle.js";

const pagina = iniciarPagina({ titulo: "Mis pedidos", roles: ["minorista", "institucional"] });

const filtro = { estado: "", q: "" };
let ordenes = [];
const tabla = h("div", { class: "table-wrap" });

function pintarTabla() {
  const filas = ordenes.filter((o) => (!filtro.estado || o.estado === filtro.estado) && sinAcentos(o.numero_orden).includes(sinAcentos(filtro.q)));
  mount(tabla,
    h("table", { class: "data-table" },
      h("thead", {}, h("tr", {},
        h("th", {}, "Orden"), h("th", {}, "Fecha"), h("th", {}, "Artículos"), h("th", { class: "num" }, "Total"), h("th", {}, "Estado"),
        h("th", {}, h("span", { class: "sr" }, "Acciones")))),
      h("tbody", {},
        filas.length
          ? filas.map((o) => {
              const unidades = (o.detalles || []).reduce((s, d) => s + d.cantidad, 0);
              return h("tr", {},
                h("td", { "data-label": "Orden" }, h("b", {}, o.numero_orden)),
                h("td", { "data-label": "Fecha" }, fecha(o.fecha_orden)),
                h("td", { "data-label": "Artículos" }, `${unidades} ${unidades === 1 ? "libro" : "libros"}`),
                h("td", { "data-label": "Total", class: "num" }, h("b", {}, money(o.total_final))),
                h("td", { "data-label": "Estado" }, insignia(o.estado)),
                h("td", { class: "actions" },
                  h("button", { class: "row-action", onclick: () => modal(`Orden ${o.numero_orden}`, detalleOrden(o)) }, "Ver detalle", icon("arrow", 14))));
            })
          : h("tr", {}, h("td", { colspan: "6", class: "table-empty" }, "No hay pedidos con esos filtros.")))));
}

async function cargar() {
  const { main } = pagina;
  mount(main, cargando());
  try {
    ordenes = (await ordenesApi.mias()).data;
    if (!ordenes.length) {
      mount(main, titulo({ titulo: "Historial de pedidos" }), vacio({
        titulo: "Aún no tienes pedidos", iconName: "receipt", texto: "Cuando confirmes una compra, aparecerá aquí con su estado.",
        accion: h("a", { class: "btn", href: "/catalogo.html" }, "Explorar el catálogo"),
      }));
      return;
    }
    mount(main,
      titulo({ titulo: "Historial de pedidos", texto: "Consulta el estado y el desglose de cada compra." }),
      h("div", { class: "table-toolbar" },
        h("label", { class: "small-search" }, icon("search", 17),
          h("input", { type: "search", placeholder: "Buscar por número de orden", "aria-label": "Buscar orden", oninput: (e) => { filtro.q = e.target.value; pintarTabla(); } })),
        h("select", { "aria-label": "Filtrar por estado", onchange: (e) => { filtro.estado = e.target.value; pintarTabla(); } },
          h("option", { value: "" }, "Todos los estados"), ESTADOS_ORDEN.map((e) => h("option", {}, e)))),
      tabla);
    pintarTabla();
  } catch (error) {
    mount(main, errorEstado(error, cargar));
  }
}

if (pagina) cargar();
