// CRUD de catálogo (RF-05.1): libros, existencias, autores, géneros y editoriales.

import { h, mount, icon, money, autoresDe, nombreCompleto, sinAcentos, modal, ocupado, toast, confirmar } from "../core/dom.js";
import { iniciarPagina } from "../core/layout.js";
import { catalogoApi } from "../core/api.js";
import { portada, cargando, errorEstado, titulo } from "../core/components.js";

const pagina = iniciarPagina({ zona: "panel", titulo: "Gestión de catálogo", roles: ["admin"] });
const PESTANAS = ["Libros", "Existencias", "Autores", "Géneros", "Editoriales"];

const datos = { productos: [], autores: [], generos: [], editoriales: [], formatos: [] };
let pestana = "Libros";
let busqueda = "";
const zona = h("div", {});

/* ---------- Formularios ---------- */

function campo(etiqueta, control, ancho = false) {
  return h("label", { class: ancho ? "field wide" : "field" }, etiqueta, control);
}

function validarFormulario(form) {
  const invalidos = [...form.querySelectorAll("input, select, textarea")].filter((c) => !c.checkValidity());
  invalidos.forEach((c) => c.setAttribute("aria-invalid", "true"));
  form.querySelectorAll("[aria-invalid='true']").forEach((c) => c.checkValidity() && c.setAttribute("aria-invalid", "false"));
  invalidos[0]?.focus();
  return invalidos.length === 0;
}

/* ---------- Portadas (Cloudinary) ---------- */

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PESO_MAXIMO = 5 * 1024 * 1024;
let selectores = 0;

/**
 * Selector de portada con vista previa: el archivo se elige o se arrastra,
 * se valida en el navegador y el Controlador lo sube a Cloudinary al guardar.
 */
function selectorPortada(libro = {}) {
  const id = `portada-${++selectores}`;
  let archivo = null;
  let vistaPrevia = null;
  const input = h("input", { id, type: "file", accept: TIPOS_IMAGEN.join(","), class: "sr-only" });
  const enlace = h("input", { type: "url", placeholder: "https://…", value: libro.portada_url || "", "aria-label": "Enlace de la imagen de portada" });
  const previa = h("div", { class: "cover-preview" });
  const detalle = h("small", { class: "cover-file" });
  const error = h("small", { class: "error-text", "aria-live": "polite" });
  const quitar = h("button", { type: "button", class: "text-link", hidden: true, onclick: () => elegir(null) }, "Quitar");

  const pintarPrevia = () => mount(previa, vistaPrevia
    ? h("div", { class: "cover has-image" }, h("img", { src: vistaPrevia, alt: "Vista previa de la nueva portada" }))
    : portada({ ...libro, portada_url: enlace.value.trim() || libro.portada_url }));

  function elegir(nuevo) {
    error.textContent = "";
    if (nuevo && !TIPOS_IMAGEN.includes(nuevo.type)) { error.textContent = "Usa una imagen JPG, PNG, WEBP o GIF."; return; }
    if (nuevo && nuevo.size > PESO_MAXIMO) { error.textContent = "La imagen pesa más de 5 MB. Elige una más ligera."; return; }
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    archivo = nuevo;
    vistaPrevia = nuevo ? URL.createObjectURL(nuevo) : null;
    input.value = "";
    const peso = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
    detalle.textContent = nuevo ? `${nuevo.name} · ${peso(nuevo.size)}` : "JPG, PNG, WEBP o GIF, hasta 5 MB";
    quitar.hidden = !nuevo;
    pintarPrevia();
  }

  input.addEventListener("change", () => elegir(input.files[0] || null));
  enlace.addEventListener("change", () => !archivo && pintarPrevia());

  const zona = h("div", {
    class: "cover-drop",
    ondragover: (e) => { e.preventDefault(); zona.classList.add("dragging"); },
    ondragleave: () => zona.classList.remove("dragging"),
    ondrop: (e) => { e.preventDefault(); zona.classList.remove("dragging"); elegir(e.dataTransfer.files[0] || null); },
  },
  previa,
  h("div", { class: "cover-drop-copy" },
    h("b", {}, "Portada"),
    h("p", {}, "Arrastra una imagen aquí o elígela de tu computadora. Se guarda en Cloudinary."),
    h("div", { class: "cover-actions" },
      h("label", { class: "btn ghost small", for: id }, icon("upload", 16), "Elegir imagen"),
      quitar),
    detalle,
    error,
    h("details", { class: "cover-link" }, h("summary", {}, "Usar un enlace de imagen"), enlace)),
  input);

  elegir(null);
  return {
    el: zona,
    archivo: () => archivo,
    enlace: () => enlace.value.trim(),
    refrescar: (cambios) => { Object.assign(libro, cambios); if (!archivo) pintarPrevia(); },
  };
}

/** Errores de subida explicados para el administrador. */
function errorDePortada(error) {
  if (error.status === 500) return new Error("No se pudo subir la portada. Revisa que las llaves de Cloudinary estén en el .env del servidor.");
  return error;
}

function campoAutor() {
  const lista = `autores-${++selectores}`;
  const input = h("input", { list: lista, required: true, minlength: "3", maxlength: "150", placeholder: "Escribe o elige un autor", autocomplete: "off" });
  const opciones = h("datalist", { id: lista }, datos.autores.map((a) => h("option", { value: nombreCompleto(a) })));
  const nota = h("small", { class: "field-hint", "aria-live": "polite" });
  const nombres = h("input", { maxlength: "150", "aria-label": "Nombres del autor nuevo" });
  const apellidos = h("input", { maxlength: "150", "aria-label": "Apellidos del autor nuevo" });
  const nuevo = h("div", { class: "author-new", hidden: true }, campo("Nombres", nombres), campo("Apellidos", apellidos));

  const existente = () => datos.autores.find((a) => sinAcentos(nombreCompleto(a)) === sinAcentos(input.value.trim()));
  const revisar = () => {
    const texto = input.value.trim().replace(/\s+/g, " ");
    const esNuevo = texto.length >= 3 && !existente();
    nota.textContent = !texto ? "" : esNuevo ? "Autor nuevo: revisa nombres y apellidos; se agregará al guardar." : "Autor del catálogo.";
    nuevo.hidden = !esNuevo;
    nombres.required = apellidos.required = esNuevo;
    if (esNuevo) {
      // Propuesta: con 4 palabras o más, las dos últimas son apellidos; si no, la última.
      const partes = texto.split(" ");
      const corte = partes.length >= 4 ? partes.length - 2 : Math.max(1, partes.length - 1);
      nombres.value = partes.slice(0, corte).join(" ");
      apellidos.value = partes.slice(corte).join(" ");
    }
  };
  const el = h("div", { class: "field" },
    h("label", { class: "field", style: { marginBottom: "0" } }, "Autor", input),
    opciones, nota, nuevo);
  input.addEventListener("input", () => { revisar(); el.classList.toggle("wide", !nuevo.hidden); });
  input.addEventListener("change", () => { revisar(); el.classList.toggle("wide", !nuevo.hidden); });

  return {
    el,
    /** Devuelve el id del autor; si es nuevo, primero lo crea en el catálogo. */
    async resolver() {
      const encontrado = existente();
      if (encontrado) return encontrado.id;
      const creado = (await catalogoApi.crearAutor({ nombres: nombres.value.trim(), apellidos: apellidos.value.trim() })).data;
      datos.autores.push(creado);
      return creado.id;
    },
  };
}

function editarProducto(p) {
  const precio = h("input", { type: "number", min: "0.01", step: "0.01", required: true, value: p.precio_base });
  const stock = h("input", { type: "number", min: "0", step: "1", required: true, value: p.stock_disponible });
  const selector = selectorPortada({ ...p.libro });
  const boton = h("button", { class: "btn full", type: "submit" }, "Guardar cambios");
  const cerrar = modal(`Editar ${p.libro?.titulo}`, h("form", {
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      if (!validarFormulario(e.currentTarget)) return;
      const texto = boton.textContent;
      ocupado(boton, async () => {
        try {
          const archivo = selector.archivo();
          const enlace = selector.enlace();
          if (archivo) {
            boton.textContent = "Subiendo portada…";
            await catalogoApi.cambiarPortada(p.libro_id, archivo).catch((err) => { throw errorDePortada(err); });
          } else if (enlace !== (p.libro?.portada_url || "")) {
            await catalogoApi.actualizarLibro(p.libro_id, { portada_url: enlace || null });
          }
          boton.textContent = "Guardando…";
          await catalogoApi.actualizarProducto(p.id, { precio_base: Number(precio.value), stock_disponible: Number(stock.value) });
          toast(archivo ? "Libro y portada actualizados" : "Libro actualizado");
          cerrar();
          await cargar(false);
        } catch (error) {
          toast(error.message, { error: true });
        } finally {
          boton.textContent = texto;
        }
      });
    },
  },
  h("table", { class: "spec-table modal-summary" },
    h("tbody", {},
      h("tr", {}, h("th", {}, "Formato"), h("td", {}, p.formato?.nombre)),
      h("tr", {}, h("th", {}, "ISBN"), h("td", {}, p.isbn)))),
  selector.el,
  h("p", { class: "field-note" }, "La portada se cambia en todos los formatos de este libro."),
  h("div", { class: "form-grid" }, campo("Precio base (Q)", precio), campo("Stock disponible", stock)),
  boton));
}

function nuevoProducto() {
  const libros = [...new Map(datos.productos.map((p) => [String(p.libro_id), p.libro])).values()].sort((a, b) => a.titulo.localeCompare(b.titulo));
  let modo = "existente";
  const cuerpo = h("div", {});
  const libroSel = h("select", { required: true }, h("option", { value: "" }, "Elige un libro"), libros.map((l) => h("option", { value: l.id }, l.titulo)));
  const tituloIn = h("input", { required: true, minlength: "2", maxlength: "200" });
  const anio = h("input", { type: "number", min: "1450", max: String(new Date().getFullYear() + 1), required: true, value: String(new Date().getFullYear()) });
  const sinopsis = h("textarea", { required: true, minlength: "10", maxlength: "2000", placeholder: "De qué trata el libro, en dos o tres frases." });
  const selector = selectorPortada({ id: 0, titulo: "" });
  const autor = campoAutor();
  const generoSel = h("select", { required: true }, h("option", { value: "" }, "Elige un género"), datos.generos.map((g) => h("option", { value: g.id }, g.nombre)));
  const editorialSel = h("select", { required: true }, h("option", { value: "" }, "Elige una editorial"), datos.editoriales.map((e) => h("option", { value: e.id }, e.nombre)));
  const formato = h("select", { required: true });
  // Un libro solo puede tener un producto por formato: se ofrecen los formatos que aún no tiene.
  const pintarFormatos = () => {
    const usados = modo === "existente"
      ? datos.productos.filter((p) => String(p.libro_id) === libroSel.value).map((p) => String(p.formato_id))
      : [];
    const libres = datos.formatos.filter((f) => !usados.includes(String(f.id)));
    mount(formato,
      h("option", { value: "" }, libres.length ? "Elige un formato" : "Este libro ya tiene todos los formatos"),
      libres.map((f) => h("option", { value: f.id }, f.nombre)));
  };
  libroSel.addEventListener("change", pintarFormatos);
  tituloIn.addEventListener("input", () => selector.refrescar({ titulo: tituloIn.value.trim() }));
  const isbn = h("input", { required: true, pattern: "[0-9\\-Xx]{10,17}", placeholder: "978-0000000000", title: "ISBN de 10 o 13 dígitos" });
  const precio = h("input", { type: "number", min: "0.01", step: "0.01", required: true });
  const stock = h("input", { type: "number", min: "0", step: "1", required: true, value: "0" });
  const boton = h("button", { class: "btn full", type: "submit" }, "Crear en el catálogo");

  const pintar = () => { pintarFormatos(); mount(cuerpo,
    h("div", { class: "auth-tabs", role: "tablist" },
      h("button", { type: "button", role: "tab", "aria-selected": String(modo === "existente"), class: modo === "existente" ? "active" : "", onclick: () => { modo = "existente"; pintar(); } }, "Nuevo formato de un libro"),
      h("button", { type: "button", role: "tab", "aria-selected": String(modo === "nuevo"), class: modo === "nuevo" ? "active" : "", onclick: () => { modo = "nuevo"; pintar(); } }, "Libro nuevo")),
    modo === "existente"
      ? campo("Libro", libroSel)
      : h("div", { class: "form-grid" },
          campo("Título", tituloIn, true),  autor.el, campo("Género", generoSel), campo("Editorial", editorialSel), campo("Año de edición", anio),
          h("div", { class: "field wide" }, selector.el), campo("Sinopsis", sinopsis, true)),
    h("div", { class: "form-grid" }, campo("Formato", formato), campo("ISBN", isbn), campo("Precio base (Q)", precio), campo("Stock inicial", stock)),
    boton); };
  pintar();

  const cerrar = modal("Agregar al catálogo", h("form", {
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      if (!validarFormulario(e.currentTarget)) return;
      const cuerpoApi = { formato_id: formato.value, isbn: isbn.value.trim(), precio_base: Number(precio.value), stock_disponible: Number(stock.value) };
      if (modo === "existente") cuerpoApi.libro_id = libroSel.value;
      else cuerpoApi.libroNuevo = {
        titulo: tituloIn.value.trim(), sinopsis: sinopsis.value.trim(), anio_edicion: Number(anio.value),
        portada_url: selector.enlace() || null, autores_ids: [], generos_ids: [generoSel.value], editorial_id: editorialSel.value,
      };
  const texto = boton.textContent;
         ocupado(boton, async () => {
           try {
             // Si el autor es nuevo, se registra antes de crear el libro.
             if (modo === "nuevo") {
               boton.textContent = "Guardando autor…";
               cuerpoApi.libroNuevo.autores_ids = [await autor.resolver()];
             }
             // Primero se sube la portada a Cloudinary y su URL se guarda con el libro nuevo
             if (modo === "nuevo" && selector.archivo()) {
               boton.textContent = "Subiendo portada…";
               const subida = await catalogoApi.subirPortada(selector.archivo()).catch((err) => { throw errorDePortada(err); });
               cuerpoApi.libroNuevo.portada_url = subida.data.url;
             }
             boton.textContent = "Guardando…";
             await catalogoApi.crearProducto(cuerpoApi);
             toast("Libro agregado al catálogo");
             cerrar();
             await cargar(false);
           } catch (error) {
             toast(error.message, { error: true });
           } finally {
             boton.textContent = texto;
           }
         });
    },
  }, cuerpo));
}

function nuevoRegistro(tipo) {
  const config = {
    Autores: { titulo: "Nuevo autor", campos: [["nombres", "Nombres", true], ["apellidos", "Apellidos", true], ["biografia", "Biografía", false, "textarea"]], crear: catalogoApi.crearAutor, aviso: "Autor creado" },
    Géneros: { titulo: "Nuevo género", campos: [["nombre", "Nombre", true], ["descripcion", "Descripción", false, "textarea"]], crear: catalogoApi.crearGenero, aviso: "Género creado" },
    Editoriales: { titulo: "Nueva editorial", campos: [["nombre", "Nombre", true], ["email_contacto", "Correo de contacto", false, "email"], ["sitio_web", "Sitio web", false, "url"]], crear: catalogoApi.crearEditorial, aviso: "Editorial creada" },
  }[tipo];
  const controles = Object.fromEntries(config.campos.map(([n, , req, t]) => [n,
    t === "textarea" ? h("textarea", { maxlength: "1000" }) : h("input", { type: t || "text", required: req, minlength: req ? "2" : null, maxlength: "150" })]));
  const boton = h("button", { class: "btn full", type: "submit" }, "Guardar");
  const cerrar = modal(config.titulo, h("form", {
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      if (!validarFormulario(e.currentTarget)) return;
      ocupado(boton, async () => {
        try {
          await config.crear(Object.fromEntries(Object.entries(controles).map(([k, c]) => [k, c.value.trim() || null])));
          toast(config.aviso);
          cerrar();
          await cargar(false);
        } catch (error) {
          toast(error.message, { error: true });
        }
      });
    },
  }, config.campos.map(([n, etiqueta]) => campo(etiqueta, controles[n])), boton));
}

async function eliminar(p) {
  const ok = await confirmar({
    titulo: "¿Eliminar del catálogo?", peligro: true, boton: "Sí, eliminar",
    mensaje: `${p.libro?.titulo} (${p.formato?.nombre}) dejará de mostrarse en la tienda. Es una eliminación lógica: el historial de órdenes se conserva.`,
  });
  if (!ok) return;
  try {
    await catalogoApi.eliminarProducto(p.id);
    toast("Producto eliminado del catálogo");
    await cargar(false);
  } catch (error) {
    toast(error.message, { error: true });
  }
}

/* ---------- Tablas ---------- */

const coincide = (texto) => sinAcentos(texto).includes(sinAcentos(busqueda));

function tablaProductos(existencias = false) {
  const filas = datos.productos.filter((p) => coincide(`${p.libro?.titulo} ${autoresDe(p.libro)} ${p.isbn} ${p.formato?.nombre}`))
    .sort((a, b) => (existencias ? a.stock_disponible - b.stock_disponible : String(a.libro?.titulo).localeCompare(String(b.libro?.titulo))));
  return h("table", { class: "data-table" },
    h("thead", {}, h("tr", {},
      h("th", {}, "Libro"), h("th", {}, "Formato"), !existencias && h("th", {}, "ISBN"), !existencias && h("th", { class: "num" }, "Precio"),
      h("th", { class: "num" }, "Stock"), h("th", {}, h("span", { class: "sr" }, "Acciones")))),
    h("tbody", {},
      filas.length
        ? filas.map((p) => h("tr", {},
            h("td", { "data-label": "Libro", class: "book-cell" }, h("div", { class: "thumb" }, portada(p.libro)), h("span", {}, h("b", {}, p.libro?.titulo), h("small", {}, autoresDe(p.libro)))),
            h("td", { "data-label": "Formato" }, p.formato?.nombre),
            !existencias && h("td", { "data-label": "ISBN" }, p.isbn),
            !existencias && h("td", { "data-label": "Precio", class: "num" }, money(p.precio_base)),
            h("td", { "data-label": "Stock", class: "num" }, h("b", { class: p.stock_disponible < 10 ? "low-stock" : "" }, p.stock_disponible)),
            h("td", { class: "actions" },
              h("button", { class: "row-action", onclick: () => editarProducto(p) }, existencias ? "Ajustar stock" : "Editar"),
              !existencias && h("button", { class: "row-action muted", onclick: () => eliminar(p) }, "Eliminar"))))
        : h("tr", {}, h("td", { colspan: "6", class: "table-empty" }, "No hay resultados."))));
}

function editarAutor(autor) {
  const nombresIn = h("input", { type: "text", required: true, value: autor.nombres, maxlength: "150" });
  const apellidosIn = h("input", { type: "text", required: true, value: autor.apellidos, maxlength: "150" });
  const biografiaIn = h("textarea", { maxlength: "1000" }, autor.biografia || "");
  const boton = h("button", { class: "btn full", type: "submit" }, "Guardar cambios");
  const cerrar = modal("Editar autor", h("form", {
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      if (!validarFormulario(e.currentTarget)) return;
      ocupado(boton, async () => {
        try {
          await catalogoApi.actualizarAutor(autor.id, {
            nombres: nombresIn.value.trim(),
            apellidos: apellidosIn.value.trim(),
            biografia: biografiaIn.value.trim() || null,
          });
          toast("Autor actualizado exitosamente");
          cerrar();
          await cargar(false);
        } catch (error) {
          toast(error.message, { error: true });
        }
      });
    },
  }, campo("Nombres", nombresIn), campo("Apellidos", apellidosIn), campo("Biografía", biografiaIn), boton));
}

async function eliminarAutorReg(autor) {
  const ok = await confirmar({
    titulo: "¿Eliminar autor?", peligro: true, boton: "Sí, eliminar",
    mensaje: `¿Desea eliminar a '${nombreCompleto(autor)}' del catálogo? Es una eliminación lógica.`,
  });
  if (!ok) return;
  try {
    await catalogoApi.eliminarAutor(autor.id);
    toast("Autor eliminado");
    await cargar(false);
  } catch (error) {
    toast(error.message, { error: true });
  }
}

function tablaAutores() {
  const filas = datos.autores.filter((a) => coincide(`${nombreCompleto(a)} ${a.biografia || ""}`));
  return h("table", { class: "data-table" },
    h("thead", {}, h("tr", {}, h("th", {}, "Autor"), h("th", {}, "Biografía"), h("th", { class: "actions" }, "Acciones"))),
    h("tbody", {},
      filas.length
        ? filas.map((a) => h("tr", {},
            h("td", { "data-label": "Autor" }, h("b", {}, nombreCompleto(a))),
            h("td", { "data-label": "Biografía" }, a.biografia || "No registrada"),
            h("td", { class: "actions" },
              h("button", { class: "row-action", onclick: () => editarAutor(a) }, "Editar"),
              h("button", { class: "row-action muted", onclick: () => eliminarAutorReg(a) }, "Eliminar"))))
        : h("tr", {}, h("td", { colspan: "3", class: "table-empty" }, "No hay resultados."))));
}

function tablaSimple(lista, columnas) {
  const filas = lista.filter((x) => coincide(columnas.map(([, f]) => f(x)).join(" ")));
  return h("table", { class: "data-table" },
    h("thead", {}, h("tr", {}, columnas.map(([t]) => h("th", {}, t)))),
    h("tbody", {},
      filas.length
        ? filas.map((x) => h("tr", {}, columnas.map(([t, f], i) => h("td", { "data-label": t }, i === 0 ? h("b", {}, f(x)) : f(x) || "No registrado"))))
        : h("tr", {}, h("td", { colspan: String(columnas.length), class: "table-empty" }, "No hay resultados."))));
}

function pintar() {
  const tablas = {
    Libros: () => tablaProductos(),
    Existencias: () => tablaProductos(true),
    Autores: () => tablaAutores(),
    Géneros: () => tablaSimple(datos.generos, [["Género", (g) => g.nombre], ["Descripción", (g) => g.descripcion]]),
    Editoriales: () => tablaSimple(datos.editoriales, [["Editorial", (e) => e.nombre], ["Contacto", (e) => e.email_contacto], ["Sitio web", (e) => e.sitio_web]]),
  };
  mount(zona, h("div", { class: "table-wrap" }, tablas[pestana]()));
}

async function cargar(conEstado = true) {
  const { main } = pagina;
  if (conEstado) mount(main, cargando());
  try {
    const [p, a, g, e, f] = await Promise.all([
      catalogoApi.listar({ limit: 100 }), catalogoApi.autores(), catalogoApi.generos(), catalogoApi.editoriales(), catalogoApi.formatos(),
    ]);
    Object.assign(datos, { productos: p.data, autores: a.data, generos: g.data, editoriales: e.data, formatos: f.data });
    const boton = h("button", { class: "btn", onclick: () => (["Libros", "Existencias"].includes(pestana) ? nuevoProducto() : nuevoRegistro(pestana)) },
      icon("plus", 17), ["Libros", "Existencias"].includes(pestana) ? "Agregar libro" : { Autores: "Nuevo autor", Géneros: "Nuevo género", Editoriales: "Nueva editorial" }[pestana]);
    mount(main,
      titulo({ titulo: "Gestión de catálogo", texto: `${datos.productos.length} productos activos, ${datos.autores.length} autores y ${datos.generos.length} géneros.`, accion: boton }),
      h("div", { class: "tabs", role: "tablist" },
        PESTANAS.map((t) => h("button", { role: "tab", "aria-selected": String(pestana === t), class: pestana === t ? "active" : "", onclick: () => { pestana = t; cargar(false); } }, t))),
      h("div", { class: "table-toolbar" },
        h("label", { class: "small-search" }, icon("search", 17),
          h("input", { type: "search", value: busqueda, placeholder: `Buscar en ${pestana.toLowerCase()}`, "aria-label": `Buscar en ${pestana.toLowerCase()}`, oninput: (ev) => { busqueda = ev.target.value; pintar(); } }))),
      zona);
    pintar();
  } catch (error) {
    mount(main, errorEstado(error, cargar));
  }
}

if (pagina) cargar();
