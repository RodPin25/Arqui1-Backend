// Sesión del usuario en el navegador.
// Los tokens viajan en el encabezado Authorization (no en cookies), lo que
// evita ataques CSRF. El Controlador vuelve a verificar token y rol en cada
// petición: esta sesión solo decide qué Vista mostrar.

const CLAVES = { access: "ln_access", refresh: "ln_refresh", usuario: "ln_usuario" };

function leer(clave) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function escribir(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* almacenamiento no disponible: la sesión dura solo esta página */
  }
}

export const accessToken = () => leer(CLAVES.access);
export const refreshToken = () => leer(CLAVES.refresh);

export function usuario() {
  try {
    return JSON.parse(leer(CLAVES.usuario) || "null");
  } catch {
    return null;
  }
}

export function guardarSesion({ usuario: u, tokens }) {
  if (tokens) guardarTokens(tokens);
  if (u) escribir(CLAVES.usuario, JSON.stringify(u));
}

export function guardarTokens({ accessToken: a, refreshToken: r }) {
  if (a) escribir(CLAVES.access, a);
  if (r) escribir(CLAVES.refresh, r);
}

export function cerrarSesion() {
  Object.values(CLAVES).forEach((c) => escribir(c, null));
}

/** Traduce el rol de la base de datos a uno de los cinco roles de la plataforma. */
export function rolDe(u = usuario()) {
  const nombre = String(u?.rol?.nombre || u?.rol || "").toUpperCase();
  if (!nombre || !accessToken()) return "visitante";
  if (["ADMIN", "ADMINISTRADOR"].includes(nombre)) return "admin";
  if (["ASESOR", "ASESOR_VENTAS"].includes(nombre)) return "asesor";
  if (["CLIENTE_INSTITUCIONAL", "MAYORISTA"].includes(nombre)) return "institucional";
  return "minorista";
}

export const NOMBRE_ROL = {
  visitante: "Visitante",
  minorista: "Cliente minorista",
  institucional: "Cliente institucional",
  asesor: "Asesor de ventas",
  admin: "Administrador",
};

export const esCliente = (rol = rolDe()) => rol === "minorista" || rol === "institucional";

/** Página de inicio de cada rol después de iniciar sesión. */
export function inicioDe(rol = rolDe()) {
  return {
    visitante: "/",
    minorista: "/catalogo.html",
    institucional: "/catalogo.html",
    asesor: "/panel/bandeja.html",
    admin: "/panel/index.html",
  }[rol];
}

/** Envía al inicio de sesión conservando la página a la que se quería ir. */
export function irALogin(mensaje) {
  const destino = location.pathname + location.search;
  const q = new URLSearchParams({ next: destino });
  if (mensaje) q.set("aviso", mensaje);
  location.href = `/login.html?${q}`;
}
