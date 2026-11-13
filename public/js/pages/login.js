// Inicio de sesión y registro (RF-02) con validación en tiempo real.

import { h, mount, icon, params, toast, ocupado } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { authApi } from "../core/api.js";
import { guardarSesion, rolDe, inicioDe } from "../core/session.js";

const pagina = iniciarPagina({ completa: true, titulo: "Ingresar" });

const REGLAS = {
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Ingresa un correo electrónico válido."),
  password: (v) => (v.length >= 8 ? "" : "Usa al menos 8 caracteres."),
  nombres: (v) => (v.trim().length >= 2 ? "" : "Escribe tu nombre."),
  apellidos: (v) => (v.trim().length >= 2 ? "" : "Escribe tus apellidos."),
  telefono: (v) => (!v || /^[+\d][\d\s-]{6,}$/.test(v) ? "" : "Escribe un teléfono válido, por ejemplo +502 5555 0000."),
  razon_social: (v) => (v.trim().length >= 3 ? "" : "Escribe el nombre legal de la institución."),
  documento_tributario: (v) => (v.trim().length >= 4 ? "" : "Escribe el NIT de la institución."),
  direccion_fiscal: (v) => (v.trim().length >= 6 ? "" : "Escribe la dirección fiscal."),
  contacto_cargo: () => "",
};

/** Campo con validación mientras se escribe. */
function campo(nombre, etiqueta, { type = "text", placeholder = "", autocomplete } = {}) {
  const input = h("input", { name: nombre, type, placeholder, autocomplete, "aria-describedby": `${nombre}-error` });
  const error = h("small", { class: "error-text", id: `${nombre}-error`, "aria-live": "polite" });
  let tocado = false;
  const validar = (forzar = false) => {
    if (forzar) tocado = true;
    const msg = REGLAS[nombre](input.value);
    const mostrar = tocado && msg;
    error.textContent = mostrar ? msg : "";
    input.setAttribute("aria-invalid", mostrar ? "true" : "false");
    return !msg;
  };
  input.addEventListener("input", () => validar());
  input.addEventListener("blur", () => validar(true));
  return { el: h("label", { class: "field" }, etiqueta, input, error), input, validar };
}

function destino() {
  const next = params().get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : inicioDe(rolDe());
}

function render() {
  const { main } = pagina;
  const q = params();
  let registro = q.has("registro");
  let tipo = q.get("registro") === "institucional" ? "institucional" : "personal";
  const tarjeta = h("div", { class: "auth-card" });
  const mensaje = h("div", { class: "auth-message" });

  // El panel de marca cambia su mensaje según el modo: ingreso, cuenta personal o institucional.
  const pintarMarca = () => {
    const modo = !registro ? "ingreso" : tipo;
    const { titulo: t, texto, ventajas } = MENSAJES[modo];
    mensaje.dataset.modo = modo;
    mount(mensaje,
      h("h1", {}, t),
      h("p", {}, texto),
      h("ul", { class: "auth-perks" }, ventajas.map((v) => h("li", {}, icon("check", 15), v))));
  };

  const pintar = () => {
    pintarMarca();
    const campos = {
      email: campo("email", "Correo electrónico", { type: "email", placeholder: "nombre@correo.com", autocomplete: "email" }),
      password: campo("password", "Contraseña", { type: "password", placeholder: "Mínimo 8 caracteres", autocomplete: registro ? "new-password" : "current-password" }),
    };
    if (registro) {
      Object.assign(campos, {
        nombres: campo("nombres", "Nombres", { autocomplete: "given-name" }),
        apellidos: campo("apellidos", "Apellidos", { autocomplete: "family-name" }),
        telefono: campo("telefono", "Teléfono (opcional)", { type: "tel", placeholder: "+502 5555 0000", autocomplete: "tel" }),
      });
      if (tipo === "institucional") {
        Object.assign(campos, {
          razon_social: campo("razon_social", "Nombre de la institución", { placeholder: "Colegio, universidad o empresa" }),
          documento_tributario: campo("documento_tributario", "NIT"),
          direccion_fiscal: campo("direccion_fiscal", "Dirección fiscal", { autocomplete: "street-address" }),
          contacto_cargo: campo("contacto_cargo", "Tu cargo (opcional)", { placeholder: "Encargada de compras" }),
        });
      }
    }
    const errorGeneral = h("div", { class: "alert warning", role: "alert", hidden: true });
    const enviar = h("button", { class: "btn full", type: "submit" }, registro ? "Crear cuenta" : "Ingresar");

    const form = h("form", {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        const validos = Object.values(campos).map((c) => c.validar(true)).every(Boolean);
        if (!validos) {
          Object.values(campos).find((c) => c.input.getAttribute("aria-invalid") === "true")?.input.focus();
          return;
        }
        errorGeneral.hidden = true;
        const valores = Object.fromEntries(Object.entries(campos).map(([k, c]) => [k, c.input.value.trim()]));
        valores.password = campos.password.input.value;
        await ocupado(enviar, async () => {
          try {
            const respuesta = registro
              ? await authApi.registrar({ ...valores, rol: tipo === "institucional" ? "CLIENTE_INSTITUCIONAL" : "CLIENTE_MINORISTA" })
              : await authApi.login(valores.email, valores.password);
            guardarSesion(respuesta.data);
            if (registro && tipo === "institucional") return pintarPendiente(valores.email);
            toast(registro ? "Cuenta creada" : "Sesión iniciada");
            location.href = destino();
          } catch (error) {
            errorGeneral.hidden = false;
            mount(errorGeneral, icon("info"), h("span", {}, error.status === 401 ? "El correo o la contraseña no son correctos." : error.message));
          }
        });
      },
    },
    q.get("aviso") && h("div", { class: "alert info" }, icon("info"), h("span", {}, q.get("aviso"))),
    h("div", { class: "auth-tabs", role: "tablist" },
      h("button", { type: "button", role: "tab", "aria-selected": String(!registro), class: !registro ? "active" : "", onclick: () => { registro = false; pintar(); } }, "Iniciar sesión"),
      h("button", { type: "button", role: "tab", "aria-selected": String(registro), class: registro ? "active" : "", onclick: () => { registro = true; pintar(); } }, "Crear cuenta")),
    h("h2", {}, registro ? "Crea tu cuenta" : "Qué gusto verte de nuevo"),
    h("p", { class: "auth-sub" }, registro ? "Elige el tipo de cuenta que mejor se adapta a ti." : "Ingresa tus datos para continuar."),
    registro && h("div", { class: "account-types" },
      [["personal", "user", "Personal", "Compras individuales"], ["institucional", "users", "Institucional", "Volumen y cotizaciones"]].map(([valor, ic, t, sub]) =>
        h("button", { type: "button", class: tipo === valor ? "active" : "", "aria-pressed": String(tipo === valor), onclick: () => { tipo = valor; pintar(); } },
          icon(ic), h("b", {}, t), h("small", {}, sub)))),
    registro ? [campos.nombres.el, campos.apellidos.el] : null,
    campos.email.el,
    campos.password.el,
    registro ? campos.telefono.el : null,
    registro && tipo === "institucional"
      ? [campos.razon_social.el, campos.documento_tributario.el, campos.direccion_fiscal.el, campos.contacto_cargo.el,
        h("div", { class: "alert info" }, icon("info"), h("span", {}, "Un asesor validará los datos de tu institución en un máximo de 2 días hábiles."))]
      : null,
    errorGeneral,
    enviar);
    mount(tarjeta, form);
  };

  const pintarPendiente = (email) => mount(tarjeta,
    h("div", { class: "pending-state" },
      h("div", { class: "success-icon warm" }, icon("info", 28)),
      h("span", { class: "badge warm" }, h("i"), "Pendiente de validación"),
      h("h2", {}, "Recibimos tu solicitud"),
      h("p", {}, "Ya puedes explorar el catálogo. Te avisaremos a ", h("b", {}, email), " cuando tu institución quede validada."),
      h("a", { class: "btn full", href: "/catalogo.html" }, "Explorar el catálogo")));

  const marca = h("aside", { class: "auth-brand" },
    h("div", { class: "auth-brand-pane" },
      h("span", { class: "auth-mark", "aria-hidden": "true" }),
      h("div", { class: "auth-brand-inner" },
        h("img", { class: "auth-logo", src: "/img/logo-claro.svg", alt: "LibroNet", width: "320", height: "161" }),
        h("span", { class: "auth-rule", "aria-hidden": "true" }),
        mensaje)));
  const envoltura = h("div", { class: "auth-wrap" }, marca, tarjeta);
  mount(main, envoltura);

  // El panel queda fijo mientras se llena el formulario, justo debajo del encabezado.
  const encabezado = document.querySelector(".store-header");
  const medir = () => envoltura.style.setProperty("--header-h", `${encabezado?.offsetHeight || 0}px`);
  medir();
  if (encabezado) new ResizeObserver(medir).observe(encabezado);
  pintar();
}

const MENSAJES = {
  ingreso: {
    titulo: "Tu biblioteca empieza con una buena historia.",
    texto: "Entra para retomar tu carrito, revisar tus pedidos y seguir tus cotizaciones.",
    ventajas: ["Carrito guardado en tu cuenta", "Historial de pedidos", "Cotizaciones en línea"],
  },
  personal: {
    titulo: "Lee a tu ritmo, compra a tu medida.",
    texto: "Crea tu cuenta personal en menos de un minuto y empieza a armar tu biblioteca.",
    ventajas: ["5% desde 6 unidades", "Pedidos con seguimiento", "Catálogo completo"],
  },
  institucional: {
    titulo: "Libros por volumen para tu institución.",
    texto: "Colegios, universidades y empresas compran con escalas especiales y cotizaciones a la medida.",
    ventajas: ["Hasta 15% por volumen", "8% adicional institucional", "Ediciones especiales bajo pedido"],
  },
};

if (pagina) {
  if (rolDe() !== "visitante" && !params().has("registro")) location.replace(destino());
  else render();
}
