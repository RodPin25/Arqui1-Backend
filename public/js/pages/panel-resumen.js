// Panel del administrador: resumen de órdenes, cotizaciones, instituciones y stock.

import { h, mount, icon, money, fecha, nombreCompleto } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { ordenesApi, cotizacionesApi, authApi, catalogoApi } from "../core/api.js";
import { escucharEvento } from "../core/socket.js";
import { usuario } from "../core/session.js";
import { insignia, cargando, errorEstado, titulo } from "../core/components.js";
import { ESTADOS_ORDEN } from "./orden-detalle.js";

const pagina = iniciarPagina({ zona: "panel", titulo: "Resumen", roles: ["admin"] });

async function cargar({ silencioso = false } = {}) {
  const { main } = pagina;
  if (!silencioso) mount(main, cargando());
  try {
    const [ord, sol, inst, prod] = await Promise.all([
      ordenesApi.todas(), cotizacionesApi.bandeja(), authApi.institucionales("pendiente"), catalogoApi.listar({ limit: 100 }),
    ]);
    const ordenes = ord.data;
    const abiertas = sol.data.filter((s) => s.estado === "Pendiente" || s.estado === "En Revisión");
    const stockBajo = prod.data.filter((p) => p.stock_disponible < 10);
    const porEstado = ESTADOS_ORDEN.map((e) => [e, ordenes.filter((o) => o.estado === e).length]);
    const maximo = Math.max(1, ...porEstado.map(([, n]) => n));

    mount(main,
      titulo({ titulo: `Buen día, ${usuario()?.nombres || "administrador"}`, texto: "Lo que necesita atención en LibroNet hoy." }),
      h("div", { class: "metrics" },
        metrica("Órdenes registradas", ordenes.length, `${porEstado[0][1]} pendientes`),
        metrica("Cotizaciones abiertas", abiertas.length, "Nuevas o en revisión"),
        metrica("Instituciones por validar", inst.data.length, "Esperan revisión"),
        metrica("Productos con stock bajo", stockBajo.length, "Menos de 10 unidades")),
      h("div", { class: "dashboard-grid" },
        h("section", { class: "panel" },
          h("div", { class: "card-heading" },
            h("div", {}, h("h3", {}, "Órdenes por estado"), h("p", {}, "Cantidad de órdenes en cada etapa")),
            h("a", { class: "text-link", href: "/panel/ordenes.html" }, "Ver órdenes")),
          h("table", { class: "state-bars" },
            h("tbody", {}, porEstado.map(([e, n]) => h("tr", {},
              h("th", {}, h("a", { href: `/panel/ordenes.html?estado=${encodeURIComponent(e)}` }, e)),
              h("td", { class: "bar-cell" }, h("span", { class: "bar-track" }, h("i", { style: { width: `${(n / maximo) * 100}%` } }))),
              h("td", { class: "num" }, h("b", {}, n))))))),
        h("section", { class: "panel pending-panel" },
          h("div", { class: "card-heading" }, h("div", {}, h("h3", {}, "Requieren atención"), h("p", {}, "Atajos a las tareas pendientes"))),
          atajo("/panel/bandeja.html", "warm", "file", `${abiertas.length} ${abiertas.length === 1 ? "cotización abierta" : "cotizaciones abiertas"}`, "Revisar la bandeja"),
          atajo("/panel/instituciones.html", "warm", "shield", `${inst.data.length} ${inst.data.length === 1 ? "institución por validar" : "instituciones por validar"}`, "Validar cuentas"),
          atajo("/panel/catalogo.html", "red", "book", `${stockBajo.length} ${stockBajo.length === 1 ? "producto con stock bajo" : "productos con stock bajo"}`, "Ajustar existencias"))),
      h("section", { class: "panel" },
        h("div", { class: "card-heading" }, h("div", {}, h("h3", {}, "Órdenes recientes"), h("p", {}, "Las últimas cinco órdenes registradas"))),
        ordenes.length
          ? h("table", { class: "compact-table" },
              h("tbody", {}, ordenes.slice(0, 5).map((o) => h("tr", {},
                h("td", {}, h("b", {}, o.numero_orden), h("small", {}, `${nombreCompleto(o.usuario)}, ${fecha(o.fecha_orden)}`)),
                h("td", { class: "num" }, h("b", {}, money(o.total_final))),
                h("td", { class: "num" }, insignia(o.estado))))))
          : h("p", { class: "panel-sub" }, "Todavía no hay órdenes.")));
  } catch (error) {
    if (!silencioso) mount(main, errorEstado(error, cargar));
  }
}

const metrica = (etiqueta, valor, nota) =>
  h("div", { class: "metric-card" }, h("span", {}, etiqueta), h("strong", {}, valor), h("small", {}, nota));

const atajo = (href, tono, ic, texto, sub) =>
  h("a", { href }, h("span", { class: `alert-icon ${tono}` }, icon(ic)), h("span", {}, h("b", {}, texto), h("small", {}, sub)), icon("arrow"));

if (pagina) {
  cargar();
  escucharEvento("cotizacion:nueva", () => cargar({ silencioso: true }));
  escucharEvento("cotizacion:actualizada", () => cargar({ silencioso: true }));
}
