// Monitoreo de órdenes (RF-05.2): filtro por estado y cambio de estado.

import { h, mount, icon, money, fecha, nombreCompleto, sinAcentos, modal, ocupado, toast, params } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { ordenesApi } from "../core/api.js";
import { insignia, cargando, errorEstado, titulo } from "../core/components.js";
import { detalleOrden, ESTADOS_ORDEN } from "./orden-detalle.js";

const pagina = iniciarPagina({ zona: "panel", titulo: "Órdenes", roles: ["asesor", "admin"] });

const filtro = { estado: params().get("estado") || "", q: "" };
let ordenes = [];
const tabla = h("div", { class: "table-wrap" });

function abrir(o) {
  const selector = h("select", { name: "estado" }, ESTADOS_ORDEN.map((e) => h("option", { selected: e === o.estado }, e)));
  const guardar = h("button", { class: "btn full" }, "Guardar estado");
  const cerrar = modal(`Orden ${o.numero_orden}`, detalleOrden(o, [
    h("label", { class: "field" }, "Cambiar estado", selector),
    guardar,
  ]));
  guardar.addEventListener("click", () => ocupado(guardar, async () => {
    if (selector.value === o.estado) return cerrar();
    try {
      await ordenesApi.cambiarEstado(o.id, selector.value);
      toast(`Orden actualizada a ${selector.value.toLowerCase()}`);
      cerrar();
      await cargar(false);
    } catch (error) {
      toast(error.message, { error: true });
    }
  }));
}

function pintar() {
  const filas = ordenes.filter((o) => sinAcentos(`${o.numero_orden} ${nombreCompleto(o.usuario)} ${o.usuario?.email}`).includes(sinAcentos(filtro.q)));
  mount(tabla,
    h("table", { class: "data-table" },
      h("thead", {}, h("tr", {}, h("th", {}, "Orden"), h("th", {}, "Cliente"), h("th", {}, "Fecha"), h("th", { class: "num" }, "Total"), h("th", {}, "Estado"), h("th", {}, h("span", { class: "sr" }, "Acciones")))),
      h("tbody", {},
        filas.length
          ? filas.map((o) => h("tr", {},
              h("td", { "data-label": "Orden" }, h("b", {}, o.numero_orden)),
              h("td", { "data-label": "Cliente" }, nombreCompleto(o.usuario), h("small", {}, o.usuario?.email)),
              h("td", { "data-label": "Fecha" }, fecha(o.fecha_orden)),
              h("td", { "data-label": "Total", class: "num" }, h("b", {}, money(o.total_final))),
              h("td", { "data-label": "Estado" }, insignia(o.estado)),
              h("td", { class: "actions" }, h("button", { class: "row-action", onclick: () => abrir(o) }, "Ver y actualizar", icon("arrow", 14)))))
          : h("tr", {}, h("td", { colspan: "6", class: "table-empty" }, "No hay órdenes con esos filtros.")))));
}

async function cargar(conEstado = true) {
  const { main } = pagina;
  if (conEstado) mount(main, cargando());
  try {
    ordenes = (await ordenesApi.todas(filtro.estado)).data;
    mount(main,
      titulo({ titulo: "Monitoreo de órdenes", texto: "Filtra las órdenes por estado y actualiza su avance." }),
      h("div", { class: "tabs", role: "tablist", "aria-label": "Estado" },
        [["", "Todas"], ...ESTADOS_ORDEN.map((e) => [e, e])].map(([valor, texto]) =>
          h("button", {
            role: "tab", "aria-selected": String(filtro.estado === valor), class: filtro.estado === valor ? "active" : "",
            onclick: () => {
              filtro.estado = valor;
              history.replaceState(null, "", valor ? `?estado=${encodeURIComponent(valor)}` : location.pathname);
              cargar(false);
            },
          }, texto))),
      h("div", { class: "table-toolbar" },
        h("label", { class: "small-search" }, icon("search", 17),
          h("input", { type: "search", value: filtro.q, placeholder: "Buscar por número o cliente", "aria-label": "Buscar orden", oninput: (e) => { filtro.q = e.target.value; pintar(); } }))),
      tabla);
    pintar();
  } catch (error) {
    mount(main, errorEstado(error, cargar));
  }
}

if (pagina) cargar();
