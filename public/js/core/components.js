// Componentes reutilizables de la Vista. Reciben datos del Controlador y
// devuelven nodos; no hacen cálculos de negocio.

import { h, icon, svgEl, money, autoresDe } from "./dom.js";

/* ---------- Portadas ---------- */

// Paletas de portada derivadas del logotipo y de tonos editoriales.
const PALETAS = [
  { bg: "#0B2A5B", fg: "#EAF6FF", ac: "#00D5DA" },
  { bg: "#D9472F", fg: "#FFF3E6", ac: "#7E1D10" },
  { bg: "#0E7C7B", fg: "#EFFFFB", ac: "#8FE3CF" },
  { bg: "#1F2A44", fg: "#F2F4F8", ac: "#F3B23C" },
  { bg: "#F3B23C", fg: "#001A40", ac: "#B4650B" },
  { bg: "#0049D2", fg: "#FFFFFF", ac: "#7FE7EC" },
  { bg: "#4F2A86", fg: "#F6EEFF", ac: "#F08BA8" },
  { bg: "#E4EEF9", fg: "#001A40", ac: "#0049D2" },
  { bg: "#0A6C9E", fg: "#FFFFFF", ac: "#BDEBFF" },
  { bg: "#FF8A5B", fg: "#001A40", ac: "#FFE1CF" },
  { bg: "#123B34", fg: "#EAF7EC", ac: "#C6E377" },
  { bg: "#F5F1E6", fg: "#001A40", ac: "#D9472F" },
];

export const paletaDe = (id) => PALETAS[Math.abs(Number(id) || 0) % PALETAS.length];

function arte(id, ac, fg) {
  const n = Math.abs(Number(id) || 0) % 6;
  const linea = { fill: "none", stroke: ac, "stroke-width": "0.9" };
  const g = svgEl("g");
  if (n === 0) {
    g.append(svgEl("path", { ...linea, "stroke-width": "0.5", d: "M12 42 28 22l18 8 12-16M28 22l-4 28 24 8 10-20M46 30l2 28" }));
    [[12, 42, 1.6], [28, 22, 2.4], [46, 30, 1.8], [58, 14, 1.5], [24, 50, 1.4], [48, 58, 2.2]].forEach(([x, y, r]) =>
      g.append(svgEl("circle", { cx: x, cy: y, r, fill: ac })));
  } else if (n === 1) {
    [12, 20, 28, 36, 44].forEach((r) => g.append(svgEl("path", { ...linea, "stroke-width": "3.4", d: `M${34 - r} 62a${r} ${r} 0 0 1 ${r * 2} 0` })));
  } else if (n === 2) {
    for (let i = 0; i < 22; i++) {
      const x = 6 + ((i * 17) % 58), y = 8 + ((i * 29) % 46);
      g.append(svgEl("path", { d: `M${x} ${y}c-3 4-3 8 0 10 3-2 3-6 0-10z`, fill: i % 3 ? "none" : ac, stroke: ac, "stroke-width": "0.6" }));
    }
  } else if (n === 3) {
    for (let i = 0; i < 30; i++) {
      const on = [1, 4, 8, 9, 13, 15, 16, 22, 23, 27].includes(i);
      g.append(svgEl("rect", { x: 8 + (i % 6) * 9.2, y: 10 + Math.floor(i / 6) * 11, width: 7.4, height: 9, fill: on ? ac : "none", stroke: ac, "stroke-width": "0.5" }));
    }
  } else if (n === 4) {
    [20, 28, 36, 44, 52, 60].forEach((y, i) => g.append(svgEl("path", { ...linea, "stroke-width": "1.1", d: `M-2 ${y}q9-${5 + i} 18 0t18 0 18 0 18 0` })));
  } else {
    g.append(svgEl("path", { d: "M-2 46q18-26 36 0t36 0v22H-2z", fill: ac, "fill-opacity": "0.35" }));
    g.append(svgEl("path", { d: "M-2 56q14-18 30-4t42-8v24H-2z", fill: ac }));
    g.append(svgEl("circle", { cx: 50, cy: 20, r: 7, fill: "none", stroke: fg }));
  }
  return svgEl("svg", { class: "cover-art", viewBox: "0 0 68 70", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true" }, g);
}

/** Portada de un libro: usa la imagen registrada y, si no carga, dibuja una portada tipográfica. */
export function portada(libro = {}) {
  const p = paletaDe(libro.id);
  const tipografica = () =>
    h("div", { class: "cover", style: { background: p.bg, color: p.fg } },
      arte(libro.id, p.ac, p.fg),
      h("div", { class: "cover-text" }, h("strong", {}, libro.titulo || "Sin título"), h("small", {}, autoresDe(libro))));

  if (!libro.portada_url || !/^https?:\/\//i.test(libro.portada_url)) return tipografica();
  const caja = h("div", { class: "cover has-image", style: { background: p.bg } });
  const img = h("img", { src: libro.portada_url, alt: `Portada de ${libro.titulo}`, loading: "lazy", referrerpolicy: "no-referrer" });
  img.addEventListener("error", () => caja.replaceWith(tipografica()), { once: true });
  caja.append(img);
  return caja;
}

/** Estante de la portada: un lomo por libro; la rueda del mouse lo recorre de lado. */
export function estante(productos) {
  const tamanos = [[62, 92], [48, 80], [40, 86], [58, 96], [70, 84], [44, 90], [54, 78], [46, 94], [64, 88], [50, 82], [60, 98], [38, 76]];
  const conLibro = productos.filter((p) => p.libro);
  // Como en una librería: cada ejemplar impreso tiene su lomo (tapa dura y tapa blanda).
  const fisicos = conLibro.filter((p) => /f[ií]sico/i.test(`${p.formato?.codigo || ""} ${p.formato?.nombre || ""}`));
  const vistos = new Set();
  const lomos = fisicos.length
    ? fisicos
    : conLibro.filter((p) => !vistos.has(p.libro.id) && vistos.add(p.libro.id));
  const titulos = new Set(lomos.map((p) => p.libro.id)).size;

  const repisa = h("div", { class: "shelf", role: "list", tabindex: "0", "aria-label": `Estante con ${lomos.length} libros` },
    lomos.map((prod, i) => {
      const [base, alto] = tamanos[Number(prod.libro.id) % tamanos.length || 0];
      const dura = /dura|_TD/i.test(`${prod.formato?.codigo || ""} ${prod.formato?.nombre || ""}`);
      const pal = paletaDe(prod.libro.id);
      const formato = fisicos.length ? (dura ? "TD" : "TB") : "";
      const a = h("a", {
        class: dura ? "spine hardcover" : "spine", href: `/libro.html?id=${encodeURIComponent(prod.id)}`, role: "listitem",
        "aria-label": `${prod.libro.titulo}, de ${autoresDe(prod.libro)}${prod.formato?.nombre ? `, ${prod.formato.nombre}` : ""}`,
        style: {
          background: pal.bg, color: pal.fg,
          width: `${base + (dura ? 10 : 0)}px`, height: `${Math.min(100, alto + (dura ? 4 : -2))}%`,
          animationDelay: `${Math.min(i, 16) * 45}ms`,
        },
      }, h("span", {}, prod.libro.titulo), formato && h("small", { class: "spine-label", "aria-hidden": "true" }, formato));
      a.style.setProperty("--tick", pal.ac);
      return a;
    }));

  // Bordes difuminados solo del lado en que quedan libros por ver.
  const bordes = () => {
    const max = repisa.scrollWidth - repisa.clientWidth;
    repisa.classList.toggle("more-left", repisa.scrollLeft > 2);
    repisa.classList.toggle("more-right", max - repisa.scrollLeft > 2);
  };

  // La rueda vertical mueve el estante; en los extremos deja seguir el scroll de la página.
  let destino = null;
  let animando = false;
  const animar = () => {
    const paso = (destino - repisa.scrollLeft) * 0.22;
    if (Math.abs(paso) < 0.5) { repisa.scrollLeft = destino; destino = null; animando = false; return; }
    repisa.scrollLeft += paso;
    requestAnimationFrame(animar);
  };
  repisa.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    const max = repisa.scrollWidth - repisa.clientWidth;
    if (max <= 0) return;
    const actual = destino ?? repisa.scrollLeft;
    const delta = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? repisa.clientWidth : 1);
    if ((delta < 0 && actual <= 0) || (delta > 0 && actual >= max)) return;
    e.preventDefault();
    destino = Math.max(0, Math.min(max, actual + delta));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { repisa.scrollLeft = destino; destino = null; return; }
    if (!animando) { animando = true; requestAnimationFrame(animar); }
  }, { passive: false });
  repisa.addEventListener("scroll", bordes, { passive: true });
  new ResizeObserver(bordes).observe(repisa);

  return h("div", { class: "shelf-area" },
    lomos.length > 6 && h("p", { class: "shelf-hint" },
      fisicos.length ? `${lomos.length} ejemplares de ${titulos} títulos · ` : `${lomos.length} libros · `,
      h("span", { class: "hint-mouse" }, "usa la rueda del mouse para recorrer el estante"),
      h("span", { class: "hint-touch" }, "desliza para recorrer el estante")),
    repisa);
}

/** Tarjeta de libro para las cuadrículas del catálogo. */
export function tarjetaLibro(prod, { alAgregar } = {}) {
  const url = `/libro.html?id=${encodeURIComponent(prod.id)}`;
  const libro = prod.libro || {};
  const sinStock = !(prod.stock_disponible > 0);
  return h("article", { class: "book-card" },
    h("a", { href: url, class: "cover-btn", tabindex: "-1", "aria-hidden": "true" }, portada(libro)),
    h("h3", {}, h("a", { href: url }, libro.titulo)),
    h("p", { class: "book-author" }, autoresDe(libro)),
    h("p", { class: "book-format" }, prod.formato?.nombre, sinStock ? ", agotado" : prod.stock_disponible < 10 ? ", últimas unidades" : ""),
    h("div", { class: "book-bottom" },
      h("strong", {}, money(prod.precio_base)),
      alAgregar && h("button", {
        class: "add-button", disabled: sinStock, onclick: (e) => alAgregar(prod, e.currentTarget),
        "aria-label": `Agregar ${libro.titulo} al carrito`,
      }, icon("plus", 16), "Agregar")));
}

/* ---------- Estados ---------- */

const TONOS = {
  pendiente: "warm", "en revisión": "blue", cotizada: "blue", emitida: "blue", aprobado: "blue",
  enviado: "green", aceptada: "green", verificado: "green", activo: "green", "aprobada por cliente": "green",
  cancelado: "red", cancelada: "red", rechazado: "red", "rechazada por cliente": "red", inactivo: "neutral",
};

const ETIQUETAS = { pendiente: "Por validar", verificado: "Validada", rechazado: "Rechazada" };

export function insignia(texto, tono) {
  const t = tono || TONOS[String(texto).toLowerCase()] || "neutral";
  return h("span", { class: `badge ${t}` }, h("i"), ETIQUETAS[texto] || texto);
}

export const cargando = (texto = "Cargando información") =>
  h("div", { class: "state-card", role: "status" },
    h("div", { class: "loader" }, h("img", { src: "/img/marca.svg", alt: "", width: "40", height: "40" })),
    h("h3", {}, texto));

export function vacio({ titulo, texto, accion, iconName = "search" }) {
  return h("div", { class: "empty" },
    h("div", {}, icon(iconName, 28)),
    h("h2", {}, titulo),
    texto && h("p", {}, texto),
    accion);
}

export function errorEstado(error, reintentar) {
  if (error?.status === 403) {
    return h("div", { class: "state-card" },
      h("strong", { class: "error-code" }, "403"),
      h("h3", {}, "Acceso denegado"),
      h("p", {}, "Tu cuenta no tiene permisos para ver esta sección."),
      h("a", { class: "btn ghost small", href: "/" }, "Volver al inicio"));
  }
  return h("div", { class: "state-card" },
    h("div", { class: "state-icon error" }, "!"),
    h("h3", {}, "No se pudo cargar la información"),
    h("p", {}, error?.message || "Intenta de nuevo en unos segundos."),
    reintentar && h("button", { class: "btn ghost small", onclick: reintentar }, "Reintentar"));
}

export function titulo({ titulo: t, texto, accion, kicker }) {
  return h("div", { class: "page-title" },
    h("div", {}, kicker && h("p", { class: "kicker" }, kicker), h("h1", {}, t), texto && h("p", { class: "lede" }, texto)),
    accion);
}

export function paginacion({ page, totalPages }, irA) {
  if (!totalPages || totalPages < 2) return null;
  const nav = h("nav", { class: "pagination", "aria-label": "Paginación" });
  nav.append(h("button", { disabled: page <= 1, onclick: () => irA(page - 1), "aria-label": "Página anterior" }, icon("back", 16)));
  for (let n = 1; n <= totalPages; n++) {
    nav.append(h("button", { class: n === page ? "active" : "", "aria-current": n === page ? "page" : null, onclick: () => irA(n) }, n));
  }
  nav.append(h("button", { disabled: page >= totalPages, onclick: () => irA(page + 1), "aria-label": "Página siguiente" }, icon("arrow", 16)));
  return nav;
}

/**
 * Resumen de compra con el desglose que calcula el Modelo (Carritos.calcularTotales).
 * La Vista solo muestra los montos y la regla que el Modelo aplicó.
 */
export function resumenCompra(liq, { conImpuestos = true, leyenda = "Resumen de compra" } = {}) {
  const filas = [h("tr", {}, h("th", {}, "Subtotal base"), h("td", {}, money(liq.subtotal_base)))];
  if (Number(liq.descuento_volumen) > 0) {
    filas.push(h("tr", { class: "discount" },
      h("th", {}, `Volumen (${Number(liq.porcentaje_descuento_volumen)}%)`), h("td", {}, "− " + money(liq.descuento_volumen))));
  }
  if (Number(liq.descuento_institucional) > 0) {
    filas.push(h("tr", { class: "discount" },
      h("th", {}, `Cliente institucional (${Number(liq.porcentaje_descuento_institucional)}%)`), h("td", {}, "− " + money(liq.descuento_institucional))));
  }
  if (liq.subtotal_neto !== undefined && Number(liq.subtotal_neto) !== Number(liq.subtotal_base)) {
    filas.push(h("tr", {}, h("th", {}, "Subtotal con descuentos"), h("td", {}, money(liq.subtotal_neto))));
  }
  if (conImpuestos) {
    const tasa = liq.tasa_impuesto_porcentaje !== undefined ? ` (${liq.tasa_impuesto_porcentaje}%)` : "";
    filas.push(h("tr", {}, h("th", {}, `IVA${tasa}`), h("td", {}, money(liq.total_impuestos))));
  }
  const reglas = [liq.regla_volumen, liq.es_institucional && Number(liq.total_unidades) > 0 ? liq.regla_institucional : null].filter(Boolean);
  return h("div", {},
    h("table", { class: "summary-table" },
      h("caption", {}, leyenda),
      h("tbody", {}, filas),
      h("tfoot", {}, h("tr", {}, h("th", {}, conImpuestos ? "Total final" : "Subtotal"), h("td", {}, money(conImpuestos ? liq.total_final : liq.subtotal_neto))))),
    reglas.length > 0 && h("ul", { class: "rule-list" }, reglas.map((r) => h("li", {}, r))));
}
