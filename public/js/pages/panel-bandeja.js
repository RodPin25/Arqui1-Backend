// Bandeja de cotizaciones del asesor (RF-04.3 y RF-05.3).

import { h, mount, icon, money, fecha, nombreCompleto, iniciales, ocupado, toast, sinAcentos, params } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { cotizacionesApi } from "../core/api.js";
import { escucharEvento } from "../core/socket.js";
import { usuario, rolDe } from "../core/session.js";
import { insignia, cargando, errorEstado, titulo } from "../core/components.js";

const pagina = iniciarPagina({ zona: "panel", titulo: "Bandeja de cotizaciones", roles: ["asesor", "admin"] });
const ESTADOS = ["Pendiente", "En Revisión", "Cotizada", "Aprobada por Cliente", "Rechazada por Cliente"];

let solicitudes = [];
const filtro = { estado: params().get("estado") || "", q: "" };
const ultima = (s) => [...(s.propuestas || [])].sort((a, b) => Number(b.id) - Number(a.id))[0];
const en = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

function formularioPropuesta(s) {
  const unitario = h("input", { type: "number", min: "0.01", step: "0.01", inputmode: "decimal", required: true, name: "unitario" });
  const total = h("input", { type: "number", min: "0.01", step: "0.01", inputmode: "decimal", required: true, name: "total" });
  const dias = h("input", { type: "number", min: "1", step: "1", inputmode: "numeric", required: true, value: "30", name: "dias" });
  const validez = h("input", { type: "date", min: en(1), value: en(15), required: true, name: "validez" });
  const condiciones = h("textarea", { name: "condiciones", maxlength: "1000" }, "50% de anticipo para iniciar producción. Saldo contra entrega.");
  const error = h("small", { class: "error-text", "aria-live": "polite" });
  let totalEditado = false;
  // Sugerencia para el asesor: total = unitario × cantidad solicitada. Puede ajustarlo.
  unitario.addEventListener("input", () => { if (!totalEditado && unitario.value) total.value = (Number(unitario.value) * s.cantidad_estimada).toFixed(2); });
  total.addEventListener("input", () => (totalEditado = true));
  const boton = h("button", { class: "btn full", type: "submit" }, "Emitir cotización formal");

  return h("form", {
    class: "quote-builder", novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      const problemas = [];
      if (!(Number(unitario.value) > 0)) problemas.push("el precio unitario");
      if (!(Number(total.value) > 0)) problemas.push("el total");
      if (!(Number.isInteger(Number(dias.value)) && Number(dias.value) > 0)) problemas.push("los días de entrega");
      if (!validez.value || validez.value < en(1)) problemas.push("una fecha de validez futura");
      error.textContent = problemas.length ? `Revisa ${problemas.join(", ")}.` : "";
      if (problemas.length) return;
      await ocupado(boton, async () => {
        try {
          await cotizacionesApi.proponer(s.id, {
            costo_unitario_ofrecido: Number(unitario.value),
            costo_total_propuesto: Number(total.value),
            tiempo_entrega_dias: Number(dias.value),
            fecha_validez: validez.value,
            condiciones_comerciales: condiciones.value.trim(),
          });
          toast("Cotización emitida");
          await cargar(s.id);
        } catch (err) {
          toast(err.message, { error: true });
        }
      });
    },
  },
  h("h3", {}, ultima(s) ? "Emitir nueva cotización" : "Preparar cotización"),
  h("p", {}, `Para ${s.cantidad_estimada} unidades. El total se sugiere a partir del precio unitario y puedes ajustarlo.`),
  h("label", { class: "field" }, "Precio unitario (Q)", unitario),
  h("label", { class: "field" }, "Total propuesto (Q)", total),
  h("div", { class: "form-grid" },
    h("label", { class: "field" }, "Entrega (días)", dias),
    h("label", { class: "field" }, "Válida hasta", validez)),
  h("label", { class: "field" }, "Condiciones comerciales", condiciones),
  error,
  boton);
}

function detalle(s) {
  const p = ultima(s);
  const yo = usuario();
  const mia = String(s.asesor_id) === String(yo?.id);
  const perfil = s.cliente?.perfil_institucional;
  const tomar = () => h("button", {
    class: "btn",
    onclick: (e) => ocupado(e.currentTarget, async () => {
      try {
        await cotizacionesApi.asignar(s.id);
        toast("Solicitud asignada a tu bandeja");
        await cargar(s.id);
      } catch (err) {
        toast(err.message, { error: true });
      }
    }),
  }, "Tomar solicitud");
  const cerrada = s.estado === "Aprobada por Cliente" || s.estado === "Rechazada por Cliente";

  return [
    h("a", { class: "back", href: "/panel/bandeja.html" }, icon("back", 16), "Volver a la bandeja"),
    titulo({
      kicker: `Solicitud ${s.codigo_solicitud}`,
      titulo: s.titulo_obra,
      accion: h("div", { class: "status-control" }, insignia(s.estado), !s.asesor_id && tomar()),
    }),
    h("div", { class: "split-layout wide-side" },
      h("div", { class: "stack" },
        h("section", { class: "panel" },
          h("h3", {}, "Requerimientos del proyecto"),
          h("table", { class: "spec-table" },
            h("tbody", {},
              h("tr", {}, h("th", {}, "Cantidad"), h("td", {}, `${s.cantidad_estimada} unidades`)),
              h("tr", {}, h("th", {}, "Entrega requerida"), h("td", {}, fecha(s.fecha_entrega_requerida))),
              h("tr", {}, h("th", {}, "Portada"), h("td", {}, s.acabado_portada)),
              h("tr", {}, h("th", {}, "Papel"), h("td", {}, s.tipo_papel)),
              h("tr", {}, h("th", {}, "Notas del cliente"), h("td", {}, s.notas_cliente || "Sin notas")),
              h("tr", {}, h("th", {}, "Asesor"), h("td", {}, s.asesor ? nombreCompleto(s.asesor) : "Sin asignar"))))),
        h("section", { class: "panel" },
          h("h3", {}, "Cliente"),
          h("div", { class: "client-row" },
            h("div", { class: "avatar" }, iniciales(perfil?.razon_social || nombreCompleto(s.cliente))),
            h("div", {}, h("b", {}, perfil?.razon_social || nombreCompleto(s.cliente)), h("span", {}, nombreCompleto(s.cliente))),
            perfil && insignia(perfil.estado_verificacion)),
          h("table", { class: "spec-table" },
            h("tbody", {},
              h("tr", {}, h("th", {}, "Correo"), h("td", {}, h("a", { href: `mailto:${s.cliente?.email}` }, s.cliente?.email))),
              h("tr", {}, h("th", {}, "Teléfono"), h("td", {}, s.cliente?.telefono || "No registrado")),
              perfil && h("tr", {}, h("th", {}, "NIT"), h("td", {}, perfil.documento_tributario)),
              perfil && h("tr", {}, h("th", {}, "Cargo"), h("td", {}, perfil.contacto_cargo || "No registrado"))))),
        (s.propuestas || []).length > 0 && h("section", { class: "panel" },
          h("h3", {}, "Cotizaciones emitidas"),
          h("div", { class: "table-scroll" },
            h("table", { class: "lines" },
              h("thead", {}, h("tr", {}, h("th", {}, "Válida hasta"), h("th", { class: "num" }, "Unitario"), h("th", { class: "num" }, "Total"), h("th", {}, "Estado"))),
              h("tbody", {}, [...s.propuestas].reverse().map((x) => h("tr", {},
                h("td", {}, fecha(x.fecha_validez), h("small", {}, `${x.tiempo_entrega_dias} días de entrega`)),
                h("td", { class: "num" }, money(x.costo_unitario_ofrecido)),
                h("td", { class: "num" }, money(x.costo_total_propuesto)),
                h("td", {}, insignia(x.estado))))))))),
      cerrada
        ? h("aside", { class: "summary-card" }, h("h3", {}, "Solicitud cerrada"),
            h("p", {}, s.estado === "Aprobada por Cliente" ? `El cliente aprobó la cotización por ${money(p?.costo_total_propuesto)}.` : "El cliente rechazó la última cotización."))
        : !s.asesor_id
          ? h("aside", { class: "summary-card" }, h("h3", {}, "Solicitud sin asignar"), h("p", {}, "Tómala para revisarla y preparar la cotización."), tomar())
          : !mia && rolDe() !== "admin"
            ? h("aside", { class: "summary-card" }, h("h3", {}, "Asignada a otro asesor"), h("p", {}, `La atiende ${nombreCompleto(s.asesor)}.`))
            : formularioPropuesta(s)),
  ];
}

function tabla(contenedor) {
  const filas = solicitudes.filter((s) => (!filtro.estado || s.estado === filtro.estado) &&
    sinAcentos(`${s.codigo_solicitud} ${s.titulo_obra} ${s.cliente?.perfil_institucional?.razon_social || ""} ${nombreCompleto(s.cliente)}`).includes(sinAcentos(filtro.q)));
  mount(contenedor,
    h("table", { class: "data-table" },
      h("thead", {}, h("tr", {}, h("th", {}, "Solicitud"), h("th", {}, "Cliente"), h("th", {}, "Requerimiento"), h("th", {}, "Entrega"), h("th", {}, "Estado"), h("th", {}, h("span", { class: "sr" }, "Acciones")))),
      h("tbody", {},
        filas.length
          ? filas.map((s) => h("tr", {},
              h("td", { "data-label": "Solicitud" }, h("b", {}, s.codigo_solicitud)),
              h("td", { "data-label": "Cliente" }, s.cliente?.perfil_institucional?.razon_social || nombreCompleto(s.cliente)),
              h("td", { "data-label": "Requerimiento" }, h("b", {}, s.titulo_obra), h("small", {}, `${s.cantidad_estimada} unidades`)),
              h("td", { "data-label": "Entrega" }, fecha(s.fecha_entrega_requerida)),
              h("td", { "data-label": "Estado" }, insignia(s.estado)),
              h("td", { class: "actions" }, h("a", { class: "row-action", href: `?id=${encodeURIComponent(s.id)}` }, "Gestionar", icon("arrow", 14)))))
          : h("tr", {}, h("td", { colspan: "6", class: "table-empty" }, "No hay solicitudes con esos filtros.")))));
}

async function cargar(abrirId, { silencioso = false } = {}) {
  const { main } = pagina;
  if (!silencioso) mount(main, cargando());
  try {
    solicitudes = (await cotizacionesApi.bandeja()).data;
    const id = abrirId ?? params().get("id");
    const elegida = id && solicitudes.find((s) => String(s.id) === String(id));
    if (elegida) {
      if (abrirId) history.replaceState(null, "", `?id=${encodeURIComponent(abrirId)}`);
      mount(main, detalle(elegida));
      return;
    }
    const cuenta = (e) => solicitudes.filter((s) => s.estado === e).length;
    const contenedor = h("div", { class: "table-wrap" });
    mount(main,
      titulo({ titulo: "Solicitudes de cotización", texto: "Toma las solicitudes nuevas, prepara la cotización y da seguimiento a la respuesta del cliente." }),
      h("div", { class: "metric-strip" },
        [["Pendiente", "Nuevas"], ["En Revisión", "En revisión"], ["Cotizada", "Esperando respuesta"], ["Aprobada por Cliente", "Aprobadas"]]
          .map(([e, t]) => h("div", {}, h("b", {}, cuenta(e)), h("span", {}, t)))),
      h("div", { class: "table-toolbar" },
        h("label", { class: "small-search" }, icon("search", 17),
          h("input", { type: "search", placeholder: "Buscar por código, obra o cliente", "aria-label": "Buscar solicitud", value: filtro.q, oninput: (e) => { filtro.q = e.target.value; tabla(contenedor); } })),
        h("select", { "aria-label": "Filtrar por estado", onchange: (e) => { filtro.estado = e.target.value; tabla(contenedor); } },
          h("option", { value: "" }, "Todos los estados"), ESTADOS.map((e) => h("option", { selected: e === filtro.estado }, e)))),
      contenedor);
    tabla(contenedor);
  } catch (error) {
    if (!silencioso) mount(main, errorEstado(error, () => cargar()));
  }
}

if (pagina) {
  cargar();
  escucharEvento("cotizacion:nueva", (payload) => {
    const codigo = payload?.solicitud?.codigo_solicitud;
    toast(codigo ? `Nueva solicitud de cotización: ${codigo}` : "Nueva solicitud de cotización recibida");
    if (!params().get("id")) cargar(null, { silencioso: true });
  });
  escucharEvento("cotizacion:actualizada", (payload) => {
    const idActual = params().get("id");
    const codigo = payload?.solicitud?.codigo_solicitud;
    if (payload?.tipo === "aprobada" && codigo) toast(`El cliente aprobó la cotización ${codigo}`);
    else if (payload?.tipo === "rechazada" && codigo) toast(`El cliente rechazó la cotización ${codigo}`);
    if (!idActual) {
      cargar(null, { silencioso: true });
    } else if (String(payload?.solicitud?.id) === String(idActual)) {
      cargar(idActual, { silencioso: true });
    }
  });
}
