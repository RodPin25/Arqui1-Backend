// Cotizaciones del cliente institucional (RF-04.3): revisar y responder propuestas.

import { h, mount, icon, money, fecha, nombreCompleto, ocupado, toast, confirmar, sinAcentos } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { cotizacionesApi } from "../core/api.js";
import { insignia, cargando, errorEstado, vacio, titulo } from "../core/components.js";

const pagina = iniciarPagina({ titulo: "Mis cotizaciones", roles: ["institucional"] });
const ESTADOS = ["Pendiente", "En Revisión", "Cotizada", "Aprobada por Cliente", "Rechazada por Cliente"];

let solicitudes = [];
const filtro = { estado: "", q: "" };
const ultima = (s) => [...(s.propuestas || [])].sort((a, b) => Number(b.id) - Number(a.id))[0];

function documento(s) {
  const p = ultima(s);
  const accionable = s.estado === "Cotizada" && p;
  const responder = async (accion, boton) => {
    const aprobar = accion === "aprobar";
    const ok = await confirmar({
      titulo: aprobar ? "¿Aprobar esta cotización?" : "¿Rechazar esta cotización?",
      mensaje: aprobar ? "Aceptas el precio, el plazo y las condiciones indicadas. El asesor recibirá tu aprobación." : "El asesor sabrá que no aceptaste la propuesta.",
      boton: aprobar ? "Sí, aprobar" : "Sí, rechazar", peligro: !aprobar,
    });
    if (!ok) return;
    await ocupado(boton, async () => {
      try {
        await cotizacionesApi.responder(s.id, accion);
        toast(aprobar ? "Cotización aprobada" : "Cotización rechazada");
        await cargar(s.id);
      } catch (error) {
        toast(error.message, { error: true });
      }
    });
  };

  return h("div", { class: "split-layout" },
    h("article", { class: "document" },
      h("div", { class: "document-head" },
        h("img", { src: "/img/logo-horizontal.svg", alt: "LibroNet", style: { height: "32px", width: "auto" } }),
        h("div", {}, h("b", {}, `Solicitud ${s.codigo_solicitud}`), h("span", {}, p ? `Cotizada, válida hasta ${fecha(p.fecha_validez)}` : "Sin cotización todavía"))),
      h("h1", {}, s.titulo_obra),
      h("table", { class: "spec-table" },
        h("tbody", {},
          h("tr", {}, h("th", {}, "Cantidad solicitada"), h("td", {}, `${s.cantidad_estimada} unidades`)),
          h("tr", {}, h("th", {}, "Acabado de portada"), h("td", {}, s.acabado_portada)),
          h("tr", {}, h("th", {}, "Tipo de papel"), h("td", {}, s.tipo_papel)),
          h("tr", {}, h("th", {}, "Entrega requerida"), h("td", {}, fecha(s.fecha_entrega_requerida))),
          s.notas_cliente && h("tr", {}, h("th", {}, "Notas"), h("td", {}, s.notas_cliente)))),
      p
        ? [h("div", { class: "table-scroll" },
            h("table", { class: "lines" },
              h("thead", {}, h("tr", {}, h("th", {}, "Concepto"), h("th", { class: "num" }, "Valor"))),
              h("tbody", {},
                h("tr", {}, h("td", {}, "Precio unitario ofrecido"), h("td", { class: "num" }, money(p.costo_unitario_ofrecido))),
                h("tr", {}, h("td", {}, "Tiempo de entrega"), h("td", { class: "num" }, `${p.tiempo_entrega_dias} días`))),
              h("tfoot", {}, h("tr", { class: "grand" }, h("td", {}, "Total propuesto"), h("td", { class: "num" }, money(p.costo_total_propuesto)))))),
          h("div", { class: "conditions" }, h("b", {}, "Condiciones comerciales"), h("p", {}, p.condiciones_comerciales || "Sin condiciones adicionales."))]
        : h("div", { class: "alert info" }, icon("info"), h("span", {}, "Tu asesor todavía está preparando la cotización. Te avisaremos cuando esté lista."))),
    h("aside", { class: "sticky-col" },
      h("div", { class: "summary-card" },
        h("h3", {}, "Estado de la solicitud"),
        h("p", { class: "quote-state" }, insignia(s.estado), p && h("span", {}, `Propuesta ${String(p.estado).toLowerCase()}`)),
        accionable && [
          h("p", {}, "Revisa la propuesta y responde antes de la fecha de validez."),
          h("button", { class: "btn full", onclick: (e) => responder("aprobar", e.currentTarget) }, icon("check", 17), "Aprobar cotización"),
          h("button", { class: "btn ghost full", onclick: (e) => responder("rechazar", e.currentTarget) }, "Rechazar"),
        ]),
      s.asesor && h("div", { class: "advisor-card" },
        h("div", { class: "avatar" }, (s.asesor.nombres || "A")[0]),
        h("span", {}, h("small", {}, "Tu asesor"), h("b", {}, nombreCompleto(s.asesor)), h("a", { href: `mailto:${s.asesor.email}` }, s.asesor.email)))));
}

function lista(contenedor) {
  const filas = solicitudes.filter((s) => (!filtro.estado || s.estado === filtro.estado) && sinAcentos(`${s.codigo_solicitud} ${s.titulo_obra}`).includes(sinAcentos(filtro.q)));
  mount(contenedor,
    h("table", { class: "data-table" },
      h("thead", {}, h("tr", {}, h("th", {}, "Solicitud"), h("th", {}, "Obra"), h("th", { class: "num" }, "Total propuesto"), h("th", {}, "Entrega"), h("th", {}, "Estado"), h("th", {}, h("span", { class: "sr" }, "Acciones")))),
      h("tbody", {},
        filas.length
          ? filas.map((s) => {
              const p = ultima(s);
              return h("tr", {},
                h("td", { "data-label": "Solicitud" }, h("b", {}, s.codigo_solicitud)),
                h("td", { "data-label": "Obra" }, s.titulo_obra, h("small", {}, `${s.cantidad_estimada} unidades`)),
                h("td", { "data-label": "Total propuesto", class: "num" }, p ? h("b", {}, money(p.costo_total_propuesto)) : "Pendiente"),
                h("td", { "data-label": "Entrega" }, fecha(s.fecha_entrega_requerida)),
                h("td", { "data-label": "Estado" }, insignia(s.estado)),
                h("td", { class: "actions" }, h("a", { class: "row-action", href: `?id=${encodeURIComponent(s.id)}` }, s.estado === "Cotizada" ? "Revisar y responder" : "Ver detalle", icon("arrow", 14))));
            })
          : h("tr", {}, h("td", { colspan: "6", class: "table-empty" }, "No hay solicitudes con esos filtros.")))));
}

async function cargar(abrirId) {
  const { main } = pagina;
  mount(main, cargando());
  try {
    solicitudes = (await cotizacionesApi.mias()).data;
    const id = abrirId ?? new URLSearchParams(location.search).get("id");
    const elegida = id && solicitudes.find((s) => String(s.id) === String(id));
    if (elegida) {
      mount(main, h("a", { class: "back", href: "/cotizaciones.html" }, icon("back", 16), "Volver a mis cotizaciones"), documento(elegida));
      return;
    }
    const encabezado = titulo({
      titulo: "Mis cotizaciones", texto: "Revisa las propuestas de tu asesor y respóndelas.",
      accion: h("a", { class: "btn", href: "/solicitud.html" }, icon("plus", 17), "Nueva solicitud"),
    });
    if (!solicitudes.length) {
      mount(main, encabezado, vacio({ titulo: "Aún no tienes solicitudes", iconName: "file", texto: "Pide una edición especial o un volumen que no esté en stock.",
        accion: h("a", { class: "btn", href: "/solicitud.html" }, "Crear solicitud") }));
      return;
    }
    const tabla = h("div", { class: "table-wrap" });
    mount(main, encabezado,
      h("div", { class: "table-toolbar" },
        h("label", { class: "small-search" }, icon("search", 17),
          h("input", { type: "search", placeholder: "Buscar por código u obra", "aria-label": "Buscar solicitud", oninput: (e) => { filtro.q = e.target.value; lista(tabla); } })),
        h("select", { "aria-label": "Filtrar por estado", onchange: (e) => { filtro.estado = e.target.value; lista(tabla); } },
          h("option", { value: "" }, "Todos los estados"), ESTADOS.map((e) => h("option", {}, e)))),
      tabla);
    lista(tabla);
  } catch (error) {
    mount(main, errorEstado(error, () => cargar()));
  }
}

if (pagina) cargar();
