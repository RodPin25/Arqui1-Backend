// Detalle de una orden, compartido por el cliente y el panel.

import { h, money, fecha, nombreCompleto, autoresDe, icon } from "../core/dom.js";
import { resumenCompra } from "../core/components.js";

export const ESTADOS_ORDEN = ["Pendiente", "Aprobado", "Enviado", "Cancelado"];

/** Montos que el Modelo guardó en la orden, en el formato del resumen (sin recalcular nada). */
export function desgloseGuardado(o) {
  return {
    subtotal_base: o.subtotal_base,
    descuento_volumen: o.descuento_volumen,
    porcentaje_descuento_volumen: o.porcentaje_descuento_volumen,
    descuento_institucional: o.descuento_institucional,
    porcentaje_descuento_institucional: o.porcentaje_descuento_institucional,
    total_impuestos: o.total_impuestos,
    total_final: o.total_final,
  };
}

function lineaTiempo(estado) {
  const pagado = estado === "Aprobado" || estado === "Enviado";
  const pasos = [{ t: "Orden recibida", n: "Registrada en el sistema", s: "done" }];
  if (estado === "Cancelado") pasos.push({ t: "Orden cancelada", n: "Se notificó al cliente", s: "failed" });
  else {
    pasos.push({ t: pagado ? "Pago aprobado" : "Pago pendiente", n: pagado ? "Confirmación recibida" : "Esperando confirmación", s: pagado ? "done" : "current" });
    pasos.push({ t: "Preparación y envío", n: estado === "Enviado" ? "En camino a su destino" : "Próximo paso", s: estado === "Enviado" ? "done" : estado === "Aprobado" ? "current" : "" });
  }
  return h("div", { class: "timeline" },
    pasos.map((p) => h("div", { class: p.s }, h("i", {}, p.s === "done" ? icon("check", 12) : null), h("span", {}, h("b", {}, p.t), h("small", {}, p.n)))));
}

export function detalleOrden(o, extra) {
  return h("div", { class: "order-detail" },
    h("table", { class: "summary-table modal-summary" },
      h("tbody", {},
        o.usuario && h("tr", {}, h("th", {}, "Cliente"), h("td", {}, nombreCompleto(o.usuario))),
        h("tr", {}, h("th", {}, "Fecha"), h("td", {}, fecha(o.fecha_orden))),
        h("tr", {}, h("th", {}, "Entrega"), h("td", { class: "wrap" }, o.direccion_entrega)))),
    h("div", { class: "table-scroll" },
      h("table", { class: "lines" },
        h("thead", {}, h("tr", {}, h("th", {}, "Libro"), h("th", { class: "num" }, "Cant."), h("th", { class: "num" }, "Precio"), h("th", { class: "num" }, "Subtotal"))),
        h("tbody", {},
          (o.detalles || []).map((d) => h("tr", {},
            h("td", {}, h("b", {}, d.producto?.libro?.titulo), h("small", {}, [d.producto?.formato?.nombre, autoresDe(d.producto?.libro)].filter(Boolean).join(", "))),
            h("td", { class: "num" }, d.cantidad),
            h("td", { class: "num" }, money(d.precio_unitario_historico)),
            h("td", { class: "num" }, money(d.subtotal_linea))))))),
    resumenCompra(desgloseGuardado(o), { leyenda: "Desglose registrado" }),
    lineaTiempo(o.estado),
    extra);
}
