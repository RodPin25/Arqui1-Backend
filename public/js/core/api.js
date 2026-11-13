// Cliente de la API REST. Es el único punto donde la Vista habla con el
// Controlador: la Vista nunca toca la base de datos ni calcula precios,
// solo muestra lo que el Controlador responde.

import { accessToken, refreshToken, guardarTokens, cerrarSesion } from "./session.js";

export class ApiError extends Error {
  constructor(mensaje, status, datos) {
    super(mensaje);
    this.status = status;
    this.datos = datos;
  }
}

let renovando = null;

async function renovarToken() {
  const refresh = refreshToken();
  if (!refresh) return false;
  renovando ??= fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const body = await r.json();
      guardarTokens(body.data.tokens);
      return true;
    })
    .catch(() => false)
    .finally(() => setTimeout(() => (renovando = null), 0));
  return renovando;
}

async function request(metodo, ruta, { body, query, reintento = false } = {}) {
  const url = new URL("/api" + ruta, location.origin);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== "" && v !== false) url.searchParams.set(k, v);
  }
  const esArchivo = body instanceof FormData;
  const headers = { Accept: "application/json" };
  if (body !== undefined && !esArchivo) headers["Content-Type"] = "application/json";
  const token = accessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(url, { method: metodo, headers, body: body === undefined || esArchivo ? body : JSON.stringify(body) });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.", 0);
  }

  // Token vencido: se intenta renovar una vez y se repite la petición.
  if ((respuesta.status === 401 || respuesta.status === 403) && token && !reintento) {
    const datosError = await respuesta.clone().json().catch(() => ({}));
    const vencido = /token/i.test(datosError.mensaje || "") && !/rol/i.test(datosError.mensaje || "");
    if (vencido && (await renovarToken())) return request(metodo, ruta, { body, query, reintento: true });
    if (vencido) cerrarSesion();
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok || datos?.ok === false) {
    throw new ApiError(datos?.mensaje || `Error ${respuesta.status} al procesar la solicitud`, respuesta.status, datos);
  }
  return datos;
}

const get = (ruta, query) => request("GET", ruta, { query });
const post = (ruta, body = {}) => request("POST", ruta, { body });
const put = (ruta, body = {}) => request("PUT", ruta, { body });
const patch = (ruta, body = {}) => request("PATCH", ruta, { body });
const del = (ruta) => request("DELETE", ruta);
const enviarArchivo = (metodo, ruta, campo, archivo) => {
  const datos = new FormData();
  datos.append(campo, archivo);
  return request(metodo, ruta, { body: datos });
};

export const authApi = {
  login: (email, password) => post("/auth/login", { email, password }),
  registrar: (datos) => post("/auth/register", datos),
  yo: () => get("/auth/me"),
  usuarios: (filtros) => get("/auth/usuarios", filtros),
  actualizarUsuario: (id, datos) => patch(`/auth/usuarios/${encodeURIComponent(id)}`, datos),
  institucionales: (estado) => get("/auth/institucionales", { estado }),
  verificarInstitucion: (usuarioId, estado_verificacion) =>
    patch(`/auth/institucionales/${encodeURIComponent(usuarioId)}/verificar`, { estado_verificacion }),
};

export const catalogoApi = {
  landing: () => get("/catalogo/landing"),
  listar: (filtros) => get("/catalogo", filtros),
  producto: (id) => get(`/catalogo/${encodeURIComponent(id)}`),
  generos: () => get("/catalogo/generos"),
  formatos: () => get("/catalogo/formatos"),
  autores: () => get("/catalogo/autores"),
  editoriales: () => get("/catalogo/editoriales"),
  crearProducto: (datos) => post("/catalogo", datos),
  actualizarProducto: (id, datos) => put(`/catalogo/${encodeURIComponent(id)}`, datos),
  eliminarProducto: (id) => del(`/catalogo/${encodeURIComponent(id)}`),
  subirPortada: (archivo) => enviarArchivo("POST", "/catalogo/subir-portada", "portada", archivo),
  cambiarPortada: (libroId, archivo) => enviarArchivo("PATCH", `/catalogo/libros/${encodeURIComponent(libroId)}/portada`, "portada", archivo),
  actualizarLibro: (libroId, datos) => put(`/catalogo/libros/${encodeURIComponent(libroId)}`, datos),
  editarLibro: (libroId, datos) => patch(`/catalogo/libros/${encodeURIComponent(libroId)}`, datos),
  crearAutor: (datos) => post("/catalogo/autores", datos),
  obtenerAutor: (id) => get(`/catalogo/autores/${encodeURIComponent(id)}`),
  actualizarAutor: (id, datos) => put(`/catalogo/autores/${encodeURIComponent(id)}`, datos),
  eliminarAutor: (id) => del(`/catalogo/autores/${encodeURIComponent(id)}`),
  crearGenero: (datos) => post("/catalogo/generos", datos),
  crearEditorial: (datos) => post("/catalogo/editoriales", datos),
};

export const carritoApi = {
  obtener: () => get("/carrito"),
  agregar: (producto_id, cantidad) => post("/carrito/items", { producto_id, cantidad }),
  cambiar: (itemId, cantidad) => put(`/carrito/items/${encodeURIComponent(itemId)}`, { cantidad }),
  quitar: (itemId) => del(`/carrito/items/${encodeURIComponent(itemId)}`),
  vaciar: () => del("/carrito"),
};

export const ordenesApi = {
  checkout: (direccion_entrega) => post("/ordenes/checkout", { direccion_entrega }),
  mias: () => get("/ordenes/mis-ordenes"),
  detalle: (id) => get(`/ordenes/${encodeURIComponent(id)}`),
  todas: (estado) => get("/ordenes", { estado }),
  cambiarEstado: (id, estado) => patch(`/ordenes/${encodeURIComponent(id)}/estado`, { estado }),
};

export const cotizacionesApi = {
  solicitar: (datos) => post("/cotizaciones/solicitar", datos),
  mias: () => get("/cotizaciones/mis-solicitudes"),
  bandeja: (estado) => get("/cotizaciones/bandeja", { estado }),
  asignar: (id) => patch(`/cotizaciones/solicitudes/${encodeURIComponent(id)}/asignar`),
  proponer: (id, datos) => post(`/cotizaciones/solicitudes/${encodeURIComponent(id)}/propuesta`, datos),
  responder: (id, accion) => post(`/cotizaciones/solicitudes/${encodeURIComponent(id)}/responder`, { accion }),
};
