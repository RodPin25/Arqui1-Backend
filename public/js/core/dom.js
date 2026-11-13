// Utilidades de la Vista para construir el DOM de forma segura.
// Todo el texto se inserta con textContent (nunca innerHTML), así los datos
// que vienen del Controlador no pueden inyectar HTML ni scripts (XSS).

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Crea un elemento HTML.
 * h("button", { class: "btn", onclick: fn }, "Guardar")
 * Los hijos pueden ser nodos, textos, números, arreglos, null o false.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "style" && typeof value === "object") Object.assign(el.style, value);
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
    else if (key === "value") el.value = value;
    else if (key === "checked" || key === "disabled" || key === "selected" || key === "required") el[key] = Boolean(value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of [children].flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Reemplaza el contenido de un contenedor. */
export function mount(parent, ...children) {
  parent.replaceChildren();
  return append(parent, children);
}

/* ---------- Formatos ---------- */

const quetzales = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n) => "Q" + quetzales.format(Number(n) || 0);

export function fecha(valor) {
  if (!valor) return "";
  const d = new Date(String(valor).length === 10 ? `${valor}T12:00:00` : valor);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "");
}

export const nombreCompleto = (u) => [u?.nombres, u?.apellidos].filter(Boolean).join(" ");
export const iniciales = (texto = "") =>
  texto.split(/\s+/).filter((p) => /^[\p{L}]/u.test(p)).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "LN";
export const autoresDe = (libro) => (libro?.autores || []).map(nombreCompleto).join(", ");
export const sinAcentos = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const params = () => new URLSearchParams(location.search);

/* ---------- Íconos (trazos fijos, sin datos del usuario) ---------- */

const ICONOS = {
  home: ["m3 11 9-8 9 8", "M5 10v10h14V10M9 20v-6h6v6"],
  book: ["M12 6.5C10 5 7 4.5 3.5 4.5v14c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-14C17 4.5 14 5 12 6.5z", "M12 6.5v14"],
  user: ["M4 21a8 8 0 0 1 16 0", "c:12,8,4"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", "c:9,7,4"],
  bag: ["M6 8h12l1 13H5z", "M9 9V6a3 3 0 0 1 6 0v3"],
  receipt: ["M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2z", "M9 9h6M9 13h6"],
  edit: ["M12 20h9", "m16.5 3.5 4 4L8 20H4v-4z"],
  file: ["M6 2h9l4 4v16H6z", "M14 2v5h5M9 13h6M9 17h6"],
  inbox: ["M4 4h16l2 12h-6l-2 3h-4l-2-3H2z", "M2 16h6"],
  chart: ["M4 20V10M10 20V4M16 20v-7M22 20V7", "M2 20h22"],
  shield: ["M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z", "m9 12 2 2 4-4"],
  store: ["M4 9h16l-1-5H5z", "M5 9v11h14V9M9 20v-6h6v6"],
  info: ["M12 11v6M12 7h.01", "c:12,12,9"],
  search: ["m20 20-4-4", "c:11,11,7"],
  arrow: ["m9 18 6-6-6-6"],
  back: ["m15 18-6-6 6-6"],
  check: ["m5 12 4 4L19 6"],
  menu: ["M4 7h16M4 12h16M4 17h16"],
  close: ["m6 6 12 12M18 6 6 18"],
  trash: ["M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"],
  plus: ["M12 5v14M5 12h14"],
  pause: ["M9 5v14M15 5v14"],
  upload: ["M12 15V4", "m7 9 5-5 5 5", "M4 15v5h16v-5"],
  play: ["M8 5v14l11-7z"],
  filter: ["M4 5h16l-6 8v6l-4-2v-4z"],
  logout: ["M15 4h4v16h-4", "M10 17l5-5-5-5M15 12H3"],
};

export function icon(nombre, size = 20) {
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries({
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
  })) svg.setAttribute(k, v);
  svg.style.flex = "none";
  for (const d of ICONOS[nombre] || []) {
    if (d.startsWith("c:")) {
      const [cx, cy, r] = d.slice(2).split(",");
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", r);
      svg.append(c);
    } else {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      svg.append(p);
    }
  }
  return svg;
}

export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

/* ---------- Avisos y modales ---------- */

let toastTimer;
/** Aviso breve. opciones: { accion: { texto, onclick }, error: true } */
export function toast(texto, { accion, error = false } = {}) {
  document.querySelector(".toast")?.remove();
  const el = h("div", { class: error ? "toast error" : "toast", role: error ? "alert" : "status" },
    icon(error ? "info" : "check", 17), h("span", {}, texto),
    accion && h("button", { onclick: () => { el.remove(); accion.onclick(); } }, accion.texto));
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), error ? 5000 : 3200);
}

/**
 * Abre un diálogo modal. Devuelve la función que lo cierra.
 * `alCerrar` se llama una sola vez, cierre como cierre (botón, fondo o Escape).
 */
export function modal(titulo, contenido, { alCerrar } = {}) {
  const previo = document.activeElement;
  let abierto = true;
  const cerrar = () => {
    if (!abierto) return;
    abierto = false;
    capa.remove();
    window.removeEventListener("keydown", onKey);
    alCerrar?.();
    previo?.focus?.();
  };
  const onKey = (e) => e.key === "Escape" && cerrar();
  const caja = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": titulo, tabindex: "-1" },
    h("div", { class: "modal-head" }, h("h2", {}, titulo),
      h("button", { onclick: cerrar, "aria-label": "Cerrar" }, icon("close"))),
    contenido);
  const capa = h("div", { class: "modal-layer" }, h("button", { class: "modal-scrim", onclick: cerrar, "aria-label": "Cerrar" }), caja);
  document.body.append(capa);
  window.addEventListener("keydown", onKey);
  caja.focus();
  return cerrar;
}

/** Pide confirmación antes de una acción. Resuelve true o false. */
export function confirmar({ titulo, mensaje, boton = "Confirmar", peligro = false }) {
  return new Promise((resolve) => {
    let respuesta = false;
    const cerrar = modal(titulo, [
      h("div", { class: "alert warning" }, icon("info"), h("span", {}, mensaje)),
      h("div", { class: "button-row end" },
        h("button", { class: "btn ghost", onclick: () => cerrar() }, "Cancelar"),
        h("button", { class: peligro ? "btn danger" : "btn", onclick: () => { respuesta = true; cerrar(); } }, boton)),
    ], { alCerrar: () => resolve(respuesta) });
  });
}

/** Marca un botón como ocupado mientras corre una promesa. */
export async function ocupado(boton, tarea) {
  const texto = boton.textContent;
  boton.disabled = true;
  boton.setAttribute("aria-busy", "true");
  try {
    return await tarea();
  } finally {
    boton.disabled = false;
    boton.removeAttribute("aria-busy");
    if (boton.textContent === "") boton.textContent = texto;
  }
}
