// Usuarios y roles (RF-02, exclusivo del administrador).

import { h, mount, icon, nombreCompleto, iniciales, sinAcentos, toast, confirmar } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { authApi } from "../core/api.js";
import { escucharEvento } from "../core/socket.js";
import { usuario } from "../core/session.js";
import { insignia, cargando, errorEstado, titulo } from "../core/components.js";

const pagina = iniciarPagina({ zona: "panel", titulo: "Usuarios y roles", roles: ["admin"] });

const NOMBRES = {
  ADMIN: "Administrador", ADMINISTRADOR: "Administrador", ASESOR: "Asesor de ventas", ASESOR_VENTAS: "Asesor de ventas",
  CLIENTE_INSTITUCIONAL: "Cliente institucional", MAYORISTA: "Cliente institucional",
  CLIENTE_MINORISTA: "Cliente minorista", CLIENTE: "Cliente minorista",
};
const nombreRol = (r) => NOMBRES[r?.nombre] || r?.nombre || "Sin rol";

let usuarios = [];
let roles = [];
const filtro = { q: "", rol: "", activo: "" };
const tabla = h("div", { class: "table-wrap" });

async function actualizar(u, cambios, aviso) {
  try {
    await authApi.actualizarUsuario(u.id, cambios);
    toast(aviso);
  } catch (error) {
    toast(error.message, { error: true });
  }
  await cargar(false);
}

function pintar() {
  const yo = usuario();
  const filas = usuarios.filter((u) =>
    (!filtro.rol || String(u.rol_id) === filtro.rol) &&
    (!filtro.activo || String(u.activo) === filtro.activo) &&
    sinAcentos(`${nombreCompleto(u)} ${u.email} ${u.perfil_institucional?.razon_social || ""}`).includes(sinAcentos(filtro.q)));
  mount(tabla,
    h("table", { class: "data-table" },
      h("thead", {}, h("tr", {}, h("th", {}, "Usuario"), h("th", {}, "Correo"), h("th", {}, "Rol"), h("th", {}, "Estado"), h("th", {}, h("span", { class: "sr" }, "Acciones")))),
      h("tbody", {},
        filas.length
          ? filas.map((u) => {
              const soyYo = String(u.id) === String(yo?.id);
              return h("tr", { class: u.activo ? "" : "inactive" },
                h("td", { "data-label": "Usuario", class: "user-cell" },
                  h("div", { class: "avatar" }, iniciales(nombreCompleto(u))),
                  h("span", {}, h("b", {}, nombreCompleto(u)), u.perfil_institucional && h("small", {}, u.perfil_institucional.razon_social))),
                h("td", { "data-label": "Correo" }, u.email),
                h("td", { "data-label": "Rol" },
                  h("select", {
                    "aria-label": `Rol de ${nombreCompleto(u)}`, disabled: soyYo,
                    onchange: async (e) => {
                      const nuevo = roles.find((r) => String(r.id) === e.target.value);
                      if (await confirmar({ titulo: "¿Cambiar el rol?", mensaje: `${nombreCompleto(u)} pasará a ser ${nombreRol(nuevo)} y sus permisos cambiarán de inmediato.`, boton: "Cambiar rol" })) {
                        actualizar(u, { rol_id: nuevo.id }, "Rol actualizado");
                      } else e.target.value = u.rol_id;
                    },
                  }, roles.map((r) => h("option", { value: r.id, selected: String(r.id) === String(u.rol_id) }, nombreRol(r))))),
                h("td", { "data-label": "Estado" }, insignia(u.activo ? "Activo" : "Inactivo")),
                h("td", { class: "actions" },
                  soyYo
                    ? h("span", { class: "row-note" }, "Tu cuenta")
                    : h("button", {
                        class: u.activo ? "row-action muted" : "row-action",
                        onclick: async () => {
                          if (u.activo && !(await confirmar({ titulo: "¿Desactivar la cuenta?", mensaje: `${nombreCompleto(u)} no podrá iniciar sesión hasta que reactives su cuenta.`, boton: "Desactivar", peligro: true }))) return;
                          actualizar(u, { activo: !u.activo }, u.activo ? "Cuenta desactivada" : "Cuenta reactivada");
                        },
                      }, u.activo ? "Desactivar" : "Reactivar")));
            })
          : h("tr", {}, h("td", { colspan: "5", class: "table-empty" }, "No hay usuarios con esos filtros.")))));
}

async function cargar(conEstado = true) {
  const { main } = pagina;
  if (conEstado) mount(main, cargando());
  try {
    usuarios = (await authApi.usuarios()).data;
    const vistos = new Map();
    usuarios.forEach((u) => u.rol && vistos.set(String(u.rol.id), u.rol));
    roles = [...vistos.values()].sort((a, b) => nombreRol(a).localeCompare(nombreRol(b)));
    const cuenta = (fn) => usuarios.filter(fn).length;
    if (conEstado || !main.querySelector(".table-toolbar")) {
      mount(main,
        titulo({ titulo: "Usuarios y roles", texto: "Asigna roles, activa o desactiva cuentas. Los permisos se verifican en el servidor en cada petición." }),
        h("div", { class: "metric-strip", id: "metricas-usuarios" }),
        h("div", { class: "table-toolbar" },
          h("label", { class: "small-search" }, icon("search", 17),
            h("input", { type: "search", placeholder: "Buscar por nombre, correo o institución", "aria-label": "Buscar usuario", oninput: (e) => { filtro.q = e.target.value; pintar(); } })),
          h("select", { "aria-label": "Filtrar por rol", onchange: (e) => { filtro.rol = e.target.value; pintar(); } },
            h("option", { value: "" }, "Todos los roles"), roles.map((r) => h("option", { value: r.id }, nombreRol(r)))),
          h("select", { "aria-label": "Filtrar por estado", onchange: (e) => { filtro.activo = e.target.value; pintar(); } },
            h("option", { value: "" }, "Todos los estados"), h("option", { value: "true" }, "Activos"), h("option", { value: "false" }, "Inactivos"))),
        tabla);
    }
    mount(main.querySelector("#metricas-usuarios"),
      h("div", {}, h("b", {}, cuenta((u) => u.activo)), h("span", {}, "Cuentas activas")),
      h("div", {}, h("b", {}, cuenta((u) => /INSTITUCIONAL|MAYORISTA/.test(u.rol?.nombre || ""))), h("span", {}, "Institucionales")),
      h("div", {}, h("b", {}, cuenta((u) => u.perfil_institucional?.estado_verificacion === "pendiente")), h("span", {}, "Por validar")),
      h("div", {}, h("b", {}, cuenta((u) => /ASESOR|ADMIN/.test(u.rol?.nombre || ""))), h("span", {}, "Personal interno")));
    pintar();
  } catch (error) {
    if (conEstado) mount(main, errorEstado(error, cargar));
  }
}

if (pagina) {
  cargar();
  ["usuario:nuevo", "usuario:actualizado", "institucion:nueva", "institucion:actualizada"].forEach((ev) =>
    escucharEvento(ev, () => cargar(false))
  );
}
