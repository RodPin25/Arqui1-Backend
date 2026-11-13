// Validación de cuentas institucionales (asesor y administrador).

import { h, mount, icon, nombreCompleto, fecha, ocupado, toast, confirmar } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { authApi } from "../core/api.js";
import { escucharEvento } from "../core/socket.js";
import { insignia, cargando, errorEstado, titulo, vacio } from "../core/components.js";

const pagina = iniciarPagina({ zona: "panel", titulo: "Instituciones", roles: ["asesor", "admin"] });
let estado = "pendiente";

async function decidir(perfil, nuevo, boton) {
  if (nuevo === "rechazado" && !(await confirmar({
    titulo: "¿Rechazar esta institución?", peligro: true, boton: "Sí, rechazar",
    mensaje: `${perfil.razon_social} no obtendrá precios institucionales hasta que se vuelva a validar.`,
  }))) return;
  await ocupado(boton, async () => {
    try {
      await authApi.verificarInstitucion(perfil.usuario_id, nuevo);
      toast(nuevo === "verificado" ? "Institución validada" : nuevo === "rechazado" ? "Institución rechazada" : "Validación reabierta");
      await cargar();
    } catch (error) {
      toast(error.message, { error: true });
    }
  });
}

async function cargar({ silencioso = false } = {}) {
  const { main } = pagina;
  if (!silencioso) mount(main, cargando());
  try {
    const perfiles = (await authApi.institucionales(estado)).data;
    mount(main,
      titulo({ titulo: "Cuentas institucionales", texto: "Revisa los datos fiscales antes de habilitar los precios y cotizaciones institucionales." }),
      h("div", { class: "tabs", role: "tablist" },
        [["pendiente", "Por validar"], ["verificado", "Validadas"], ["rechazado", "Rechazadas"]].map(([v, t]) =>
          h("button", { role: "tab", "aria-selected": String(estado === v), class: estado === v ? "active" : "", onclick: () => { estado = v; cargar(); } }, t))),
      perfiles.length
        ? h("div", { class: "table-wrap" },
            h("table", { class: "data-table" },
              h("thead", {}, h("tr", {}, h("th", {}, "Institución"), h("th", {}, "NIT"), h("th", {}, "Contacto"), h("th", {}, "Registro"), h("th", {}, "Estado"), h("th", {}, h("span", { class: "sr" }, "Acciones")))),
              h("tbody", {}, perfiles.map((p) => h("tr", {},
                h("td", { "data-label": "Institución" }, h("b", {}, p.razon_social), h("small", {}, p.direccion_fiscal)),
                h("td", { "data-label": "NIT" }, p.documento_tributario),
                h("td", { "data-label": "Contacto" }, nombreCompleto(p.usuario), h("small", {}, p.usuario?.email || p.contacto_cargo)),
                h("td", { "data-label": "Registro" }, fecha(p.created_at)),
                h("td", { "data-label": "Estado" }, insignia(p.estado_verificacion)),
                h("td", { class: "actions" },
                  p.estado_verificacion !== "verificado" && h("button", { class: "row-action", onclick: (e) => decidir(p, "verificado", e.currentTarget) }, "Validar"),
                  p.estado_verificacion === "pendiente" && h("button", { class: "row-action muted", onclick: (e) => decidir(p, "rechazado", e.currentTarget) }, "Rechazar"),
                  p.estado_verificacion === "verificado" && h("button", { class: "row-action muted", onclick: (e) => decidir(p, "pendiente", e.currentTarget) }, "Reabrir revisión")))))))
        : vacio({ titulo: estado === "pendiente" ? "No hay instituciones por validar" : "No hay instituciones en esta lista", iconName: "shield",
            texto: estado === "pendiente" ? "Cuando una institución se registre, aparecerá aquí." : "" }));
  } catch (error) {
    if (!silencioso) mount(main, errorEstado(error, cargar));
  }
}

if (pagina) {
  cargar();
  escucharEvento("institucion:nueva", (payload) => {
    const nombre = payload?.perfil?.razon_social;
    toast(nombre ? `Nueva institución por validar: ${nombre}` : "Nueva institución registrada");
    cargar({ silencioso: true });
  });
  escucharEvento("institucion:actualizada", () => cargar({ silencioso: true }));
}
