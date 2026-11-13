// Estructura común de las páginas: encabezado de la tienda o barra lateral
// del panel, pie de página, menú de usuario y protección de vistas por rol.

import { h, icon, mount, iniciales, nombreCompleto } from "./dom.js";
import { rolDe, usuario, cerrarSesion, irALogin, esCliente, NOMBRE_ROL, inicioDe } from "./session.js";
import { authApi, carritoApi } from "./api.js";
import { escucharEvento } from "./socket.js";
import { errorEstado } from "./components.js";

const NAV_TIENDA = {
  visitante: [
    ["Inicio", "/"],
    ["Catálogo", "/catalogo.html"],
    ["Para instituciones", "/login.html?registro=institucional"],
  ],
  minorista: [
    ["Inicio", "/"],
    ["Catálogo", "/catalogo.html"],
    ["Mis pedidos", "/pedidos.html"],
  ],
  institucional: [
    ["Inicio", "/"],
    ["Catálogo", "/catalogo.html"],
    ["Solicitud especial", "/solicitud.html"],
    ["Mis cotizaciones", "/cotizaciones.html"],
    ["Mis pedidos", "/pedidos.html"],
  ],
  asesor: [
    ["Inicio", "/"],
    ["Catálogo", "/catalogo.html"],
    ["Ir al panel", "/panel/bandeja.html"],
  ],
  admin: [
    ["Inicio", "/"],
    ["Catálogo", "/catalogo.html"],
    ["Ir al panel", "/panel/index.html"],
  ],
};

const NAV_PANEL = {
  asesor: [
    ["Bandeja de cotizaciones", "/panel/bandeja.html", "inbox"],
    ["Instituciones", "/panel/instituciones.html", "shield"],
    ["Órdenes", "/panel/ordenes.html", "receipt"],
    ["Ver la tienda", "/", "store"],
  ],
  admin: [
    ["Resumen", "/panel/index.html", "chart"],
    ["Catálogo", "/panel/catalogo.html", "book"],
    ["Usuarios y roles", "/panel/usuarios.html", "users"],
    ["Instituciones", "/panel/instituciones.html", "shield"],
    ["Órdenes", "/panel/ordenes.html", "receipt"],
    ["Cotizaciones", "/panel/bandeja.html", "inbox"],
    ["Ver la tienda", "/", "store"],
  ],
};

const activa = (href) => {
  const [ruta, query] = href.split("?");
  const actual = location.pathname === "/index.html" ? "/" : location.pathname;
  return ruta === actual && (!query || location.search.includes(query));
};

function menuUsuario(u, rol) {
  const nombre = nombreCompleto(u) || u?.email || "Mi cuenta";
  const lista = h("div", { class: "user-menu", hidden: true, role: "menu" },
    h("div", { class: "user-menu-head" }, h("b", {}, nombre), h("span", {}, NOMBRE_ROL[rol])),
    rol === "asesor" || rol === "admin" ? h("a", { href: inicioDe(rol), role: "menuitem" }, icon("chart", 18), "Mi panel") : null,
    esCliente(rol) ? h("a", { href: "/pedidos.html", role: "menuitem" }, icon("receipt", 18), "Mis pedidos") : null,
    h("button", {
      role: "menuitem",
      onclick: () => { cerrarSesion(); location.href = "/"; },
    }, icon("logout", 18), "Cerrar sesión"));
  const boton = h("button", {
    class: "avatar", "aria-haspopup": "menu", "aria-expanded": "false", "aria-label": `Cuenta de ${nombre}`,
    onclick: (e) => {
      e.stopPropagation();
      lista.hidden = !lista.hidden;
      boton.setAttribute("aria-expanded", String(!lista.hidden));
    },
  }, iniciales(nombre));
  document.addEventListener("click", () => { lista.hidden = true; boton.setAttribute("aria-expanded", "false"); });
  return h("div", { class: "user-wrap" }, boton, lista);
}

function encabezadoTienda(rol, u) {
  const nav = h("nav", { class: "store-nav", "aria-label": "Principal" },
    NAV_TIENDA[rol].map(([texto, href]) =>
      h("a", { href, class: activa(href) ? "active" : "", "aria-current": activa(href) ? "page" : null }, texto)));
  const busqueda = h("input", {
    id: "busqueda-global", type: "search", "aria-label": "Buscar libros",
    placeholder: "Buscar por título, autor o ISBN", value: new URLSearchParams(location.search).get("q") || "",
  });
  const form = h("form", {
    class: "header-search", role: "search",
    onsubmit: (e) => {
      e.preventDefault();
      if (location.pathname !== "/catalogo.html") location.href = `/catalogo.html?q=${encodeURIComponent(busqueda.value.trim())}`;
    },
  }, icon("search", 18), busqueda);
  const menu = h("button", {
    class: "mobile-menu", "aria-label": "Abrir menú", "aria-expanded": "false",
    onclick: () => {
      nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(nav.classList.contains("open")));
    },
  }, icon("menu"));
  return h("header", { class: "store-header" },
    h("div", { class: "store-row" },
      menu,
      h("a", { class: "logo", href: "/", "aria-label": "LibroNet, ir al inicio" },
        h("img", { src: "/img/logo-horizontal.svg", alt: "LibroNet", height: "34", style: { height: "34px", width: "auto" } })),
      form,
      h("div", { class: "header-actions" },
        esCliente(rol) && h("a", { class: "bag-button", href: "/carrito.html", "aria-label": "Carrito" },
          icon("bag", 22), h("span", { id: "contador-carrito", hidden: true }, "0")),
        rol === "visitante"
          ? h("a", { class: "btn small", href: `/login.html?next=${encodeURIComponent(location.pathname + location.search)}` }, "Ingresar")
          : menuUsuario(u, rol))),
    nav);
}

function piePagina() {
  return h("footer", { class: "footer" },
    h("div", { class: "footer-inner" },
      h("div", { class: "footer-brand" },
        h("img", { src: "/img/logo-horizontal-claro.svg", alt: "LibroNet", style: { height: "34px", width: "auto" } }),
        h("p", {}, "Plataforma editorial para lectores, librerías e instituciones.")),
      h("div", {}, h("h4", {}, "Comprar"), h("a", { href: "/catalogo.html" }, "Catálogo"), h("a", { href: "/login.html?registro=1" }, "Crear cuenta")),
      h("div", {}, h("h4", {}, "Instituciones"), h("a", { href: "/login.html?registro=institucional" }, "Compra por volumen"), h("a", { href: "/solicitud.html" }, "Ediciones especiales")),
      h("div", {}, h("h4", {}, "Contacto"), h("span", {}, "ventas@libronet.com"), h("span", {}, "+502 2200 0000"))),
    h("p", { class: "footer-note" }, `© ${new Date().getFullYear()} LibroNet. Arquitectura de Sistemas I.`));
}

function barraLateral(rol) {
  const lateral = h("aside", { class: "sidebar" },
    h("a", { class: "logo", href: inicioDe(rol), "aria-label": "LibroNet" },
      h("img", { src: "/img/logo-horizontal-claro.svg", alt: "LibroNet", style: { height: "32px", width: "auto" } })),
    h("p", { class: "side-role" }, NOMBRE_ROL[rol]),
    h("nav", { "aria-label": "Panel" },
      NAV_PANEL[rol].map(([texto, href, ic]) =>
        h("a", { href, class: activa(href) ? "active" : "", "aria-current": activa(href) ? "page" : null }, icon(ic, 19), h("span", {}, texto)))),
    h("div", { class: "side-help" },
      h("strong", {}, nombreCompleto(usuario()) || "Mi cuenta"),
      h("span", {}, usuario()?.email || ""),
      h("button", { onclick: () => { cerrarSesion(); location.href = "/"; } }, "Cerrar sesión")));
  const fondo = h("button", { class: "scrim", hidden: true, "aria-label": "Cerrar menú" });
  const alternar = (abrir) => { lateral.classList.toggle("open", abrir); fondo.hidden = !abrir; };
  fondo.addEventListener("click", () => alternar(false));
  const movil = h("div", { class: "office-mobile" },
    h("button", { class: "mobile-menu", "aria-label": "Abrir menú", onclick: () => alternar(true) }, icon("menu")),
    h("img", { src: "/img/logo-horizontal-claro.svg", alt: "LibroNet", style: { height: "28px", width: "auto" } }));
  return [movil, lateral, fondo];
}

export async function actualizarContadorCarrito(unidades) {
  const el = document.getElementById("contador-carrito");
  if (!el) return;
  if (unidades === undefined) {
    try {
      unidades = (await carritoApi.obtener()).data.liquidacion.total_unidades;
    } catch {
      return;
    }
  }
  el.textContent = unidades;
  el.hidden = !unidades;
}

/**
 * Prepara la página y devuelve el contenedor principal.
 * zona: "tienda" | "panel". roles: lista de roles que pueden ver la vista.
 */
export function iniciarPagina({ zona = "tienda", roles, completa = false, titulo } = {}) {
  const rol = rolDe();
  const u = usuario();
  if (titulo) document.title = `${titulo} | LibroNet`;

  if (roles && !roles.includes(rol) && rol === "visitante") {
    irALogin("Inicia sesión para continuar.");
    return null;
  }

  const app = document.getElementById("app");
  app.className = `app ${zona === "panel" ? "is-office" : "is-store"}`;
  const main = h("main", { id: "contenido", class: completa ? "main bleed" : "main" });
  const saltar = h("a", { class: "skip-link", href: "#contenido" }, "Saltar al contenido");

  if (zona === "panel" && (rol === "asesor" || rol === "admin")) {
    mount(app, saltar, barraLateral(rol), main);
  } else {
    mount(app, saltar, encabezadoTienda(rol, u), main, piePagina());
    if (esCliente(rol)) {
      actualizarContadorCarrito();
      escucharEvento("carrito:actualizado", () => actualizarContadorCarrito());
    }
  }

  if (roles && !roles.includes(rol)) {
    mount(main, errorEstado({ status: 403 }));
    return null;
  }

  if (rol === "institucional" && zona === "tienda") {
    avisoVerificacion(main);
    escucharEvento("institucion:actualizada", () => avisoVerificacion(main));
  }
  return { main, rol, usuario: u };
}

async function avisoVerificacion(main) {
  try {
    const estado = (await authApi.yo()).data?.perfil_institucional?.estado_verificacion;
    main.querySelector(".alert.warning[data-aviso-verificacion]")?.remove();
    if (estado && estado !== "verificado") {
      main.prepend(h("div", { class: "alert warning", "data-aviso-verificacion": "1" }, icon("info"),
        h("span", {}, estado === "rechazado"
          ? "La validación de tu institución fue rechazada. Escríbenos a ventas@libronet.com para revisarla."
          : "Tu cuenta institucional está pendiente de validación. Un asesor la revisará en un máximo de 2 días hábiles.")));
    }
  } catch {
    /* el aviso es informativo; si falla, la página sigue */
  }
}
