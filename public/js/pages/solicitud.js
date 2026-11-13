// Solicitud especial (RF-04.1 y RF-04.2), solo para clientes institucionales.

import { h, mount, icon, ocupado, toast } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { cotizacionesApi } from "../core/api.js";
import { titulo } from "../core/components.js";

const pagina = iniciarPagina({ titulo: "Solicitud especial", roles: ["institucional"] });

const TIPOS = [
  ["Edición especial", "Adaptación con la identidad de tu institución", "book"],
  ["Impresión bajo demanda", "Tirajes cortos cuando los necesites", "file"],
  ["Volumen masivo", "Grandes cantidades fuera del stock actual", "inbox"],
];

const manana = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const VALIDAR = {
  titulo_obra: (v) => (v.trim().length >= 3 ? "" : "Escribe el título u obra (mínimo 3 caracteres)."),
  cantidad_estimada: (v) => (Number.isInteger(Number(v)) && Number(v) >= 1 ? "" : "La cantidad debe ser un número entero mayor que cero."),
  fecha_entrega_requerida: (v) => (v && v >= manana() ? "" : "Elige una fecha posterior a hoy."),
  acabado_portada: (v) => (v ? "" : "Elige el acabado de portada."),
  tipo_papel: (v) => (v ? "" : "Elige el tipo de papel."),
};

function campo(nombre, etiqueta, control, ancho = false) {
  const error = h("small", { class: "error-text", id: `${nombre}-error`, "aria-live": "polite" });
  control.name = nombre;
  control.setAttribute("aria-describedby", `${nombre}-error`);
  let tocado = false;
  const validar = (forzar) => {
    if (forzar) tocado = true;
    const msg = VALIDAR[nombre]?.(control.value) || "";
    error.textContent = tocado ? msg : "";
    control.setAttribute("aria-invalid", tocado && msg ? "true" : "false");
    return !msg;
  };
  control.addEventListener("input", () => validar());
  control.addEventListener("blur", () => validar(true));
  return { el: h("label", { class: ancho ? "field wide" : "field" }, etiqueta, control, error), control, validar };
}

function render() {
  const { main } = pagina;
  let tipo = TIPOS[0][0];
  const tipos = h("div", { class: "request-types", role: "radiogroup", "aria-label": "Tipo de solicitud" });
  const pintarTipos = () => mount(tipos, TIPOS.map(([nombre, nota, ic]) =>
    h("label", { class: tipo === nombre ? "active" : "" },
      h("input", { type: "radio", name: "tipo", checked: tipo === nombre, onchange: () => { tipo = nombre; pintarTipos(); } }),
      icon(ic), h("b", {}, nombre), h("small", {}, nota))));
  pintarTipos();

  const c = {
    titulo_obra: campo("titulo_obra", "Título u obra", h("input", { maxlength: "200", placeholder: "Antología de narrativa centroamericana" }), true),
    cantidad_estimada: campo("cantidad_estimada", "Cantidad estimada", h("input", { type: "number", min: "1", step: "1", inputmode: "numeric", placeholder: "500" })),
    fecha_entrega_requerida: campo("fecha_entrega_requerida", "Fecha requerida de entrega", h("input", { type: "date", min: manana() })),
    acabado_portada: campo("acabado_portada", "Acabado de portada",
      h("select", {}, h("option", { value: "" }, "Elige un acabado"),
        ["Tapa dura con laminado mate", "Tapa dura con laminado brillante", "Tapa blanda", "Tapa blanda con solapas"].map((o) => h("option", {}, o)))),
    tipo_papel: campo("tipo_papel", "Tipo de papel",
      h("select", {}, h("option", { value: "" }, "Elige un papel"),
        ["Bond ahuesado 80 g", "Bond blanco 75 g", "Couché 90 g", "Papel reciclado 80 g"].map((o) => h("option", {}, o)))),
  };
  const notas = h("textarea", { name: "notas", maxlength: "1000", placeholder: "Personalización, logotipo, entregas por sede u otros detalles." });
  const boton = h("button", { class: "btn", type: "submit" }, "Enviar solicitud", icon("arrow", 17));

  mount(main,
    h("form", {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        const validos = Object.values(c).map((x) => x.validar(true)).every(Boolean);
        if (!validos) return Object.values(c).find((x) => x.control.getAttribute("aria-invalid") === "true")?.control.focus();
        await ocupado(boton, async () => {
          try {
            const sol = (await cotizacionesApi.solicitar({
              titulo_obra: c.titulo_obra.control.value.trim(),
              cantidad_estimada: Number(c.cantidad_estimada.control.value),
              fecha_entrega_requerida: c.fecha_entrega_requerida.control.value,
              acabado_portada: c.acabado_portada.control.value,
              tipo_papel: c.tipo_papel.control.value,
              notas_cliente: [`Tipo de solicitud: ${tipo}.`, notas.value.trim()].filter(Boolean).join(" "),
            })).data;
            mount(main, h("div", { class: "confirmation compact" },
              h("div", { class: "success-icon" }, icon("check", 30)),
              h("h1", {}, "Solicitud enviada"),
              h("p", {}, "Un asesor revisará los requerimientos y te enviará una cotización formal."),
              h("span", { class: "badge blue" }, h("i"), `Solicitud ${sol.codigo_solicitud}`),
              h("div", { class: "button-row center" }, h("a", { class: "btn", href: "/cotizaciones.html" }, "Ver mis cotizaciones"))));
          } catch (error) {
            toast(error.message, { error: true });
          }
        });
      },
    },
    titulo({ titulo: "Solicitud especial", texto: "Cuéntanos sobre tu proyecto. Un asesor de ventas preparará una cotización formal para tu institución." }),
    h("div", { class: "split-layout" },
      h("div", { class: "form-card" },
        h("div", { class: "form-section" }, h("h3", {}, h("span", {}, "1"), "Tipo de solicitud"), tipos),
        h("div", { class: "form-section" }, h("h3", {}, h("span", {}, "2"), "Requerimientos"),
          h("div", { class: "form-grid" },
            c.titulo_obra.el, c.cantidad_estimada.el, c.fecha_entrega_requerida.el, c.acabado_portada.el, c.tipo_papel.el,
            h("label", { class: "field wide" }, "Detalles adicionales (opcional)", notas))),
        boton),
      h("aside", { class: "guidance-card" },
        h("h2", {}, "Tu proyecto, bien editado."),
        h("p", {}, "Después de enviar la solicitud:"),
        h("ol", {},
          [["Revisión del asesor", "Toma tu solicitud en su bandeja"], ["Cotización formal", "Con precio, plazo y condiciones"], ["Tu aprobación", "Desde Mis cotizaciones"]]
            .map(([t, s], i) => h("li", {}, h("i", {}, i + 1), h("span", {}, h("b", {}, t), h("small", {}, s)))))))));
}

if (pagina) render();
