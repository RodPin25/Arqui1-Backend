// Cierre de orden (RF-03.3): dirección de entrega y desglose final.

import { h, mount, icon, money, autoresDe, nombreCompleto, fecha, ocupado, toast } from "../core/dom.js";
import { iniciarPagina, actualizarContadorCarrito } from "../core/layout.js";
import { carritoApi, ordenesApi, authApi } from "../core/api.js";
import { portada, resumenCompra, insignia, cargando, errorEstado, vacio, titulo } from "../core/components.js";

const pagina = iniciarPagina({ titulo: "Finalizar compra", roles: ["minorista", "institucional"] });

function confirmacion(orden, desglose, email) {
  mount(pagina.main,
    h("div", { class: "confirmation" },
      h("div", { class: "success-icon" }, icon("check", 32)),
      h("h1", {}, "¡Gracias por tu compra!"),
      h("p", {}, "Recibimos tu orden y la registramos con el desglose que calculó el sistema", email ? [" para ", h("b", {}, email)] : "", "."),
      h("div", { class: "confirmation-card" },
        h("div", { class: "confirmation-head" }, h("strong", {}, `Orden ${orden.numero_orden}`), insignia(orden.estado)),
        h("table", { class: "summary-table" },
          h("tbody", {},
            h("tr", {}, h("th", {}, "Fecha"), h("td", {}, fecha(orden.fecha_orden))),
            h("tr", {}, h("th", {}, "Entrega"), h("td", {}, orden.direccion_entrega)))),
        resumenCompra(desglose, { leyenda: "Desglose de la orden" })),
      h("div", { class: "button-row center" },
        h("a", { class: "btn", href: "/pedidos.html" }, "Ver mis pedidos"),
        h("a", { class: "btn ghost", href: "/catalogo.html" }, "Seguir explorando"))));
}

async function cargar() {
  const { main } = pagina;
  mount(main, cargando());
  try {
    const [carrito, yo] = await Promise.all([carritoApi.obtener(), authApi.yo().catch(() => null)]);
    const { items, liquidacion } = carrito.data;
    const perfil = yo?.data;
    if (!items.length) {
      mount(main, vacio({ titulo: "No hay nada que pagar", iconName: "bag", texto: "Tu carrito está vacío.",
        accion: h("a", { class: "btn", href: "/catalogo.html" }, "Explorar el catálogo") }));
      return;
    }

    const direccion = h("textarea", {
      name: "direccion", required: true, minlength: "10", maxlength: "300", autocomplete: "street-address",
      placeholder: "Calle o avenida, número, zona, municipio y departamento", "aria-describedby": "direccion-error",
    });
    if (perfil?.perfil_institucional?.direccion_fiscal) direccion.value = perfil.perfil_institucional.direccion_fiscal;
    const errorDireccion = h("small", { class: "error-text", id: "direccion-error", "aria-live": "polite" });
    const validar = () => {
      const ok = direccion.value.trim().length >= 10;
      errorDireccion.textContent = ok ? "" : "Escribe una dirección completa (mínimo 10 caracteres).";
      direccion.setAttribute("aria-invalid", ok ? "false" : "true");
      return ok;
    };
    direccion.addEventListener("input", () => direccion.getAttribute("aria-invalid") && validar());
    direccion.addEventListener("blur", validar);
    const boton = h("button", { class: "btn full", type: "submit" }, `Confirmar orden por ${money(liquidacion.total_final)}`);

    mount(main,
      h("form", {
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          if (!validar()) return direccion.focus();
          await ocupado(boton, async () => {
            try {
              const { orden, desglose_reglas } = (await ordenesApi.checkout(direccion.value.trim())).data;
              actualizarContadorCarrito(0);
              confirmacion(orden, desglose_reglas, perfil?.email);
              scrollTo({ top: 0 });
            } catch (error) {
              toast(error.message, { error: true });
            }
          });
        },
      },
      h("a", { class: "back", href: "/carrito.html" }, icon("back", 16), "Volver al carrito"),
      titulo({ titulo: "Datos de entrega", texto: "Confirma tus datos y la dirección donde recibirás el pedido." }),
      h("div", { class: "split-layout" },
        h("div", { class: "form-card" },
          h("div", { class: "form-section" },
            h("h3", {}, h("span", {}, "1"), "Contacto"),
            h("table", { class: "spec-table" },
              h("tbody", {},
                h("tr", {}, h("th", {}, "Nombre"), h("td", {}, nombreCompleto(perfil) || "No registrado")),
                h("tr", {}, h("th", {}, "Correo"), h("td", {}, perfil?.email || "No registrado")),
                h("tr", {}, h("th", {}, "Teléfono"), h("td", {}, perfil?.telefono || "No registrado")),
                perfil?.perfil_institucional && h("tr", {}, h("th", {}, "Institución"), h("td", {}, perfil.perfil_institucional.razon_social))))),
          h("div", { class: "form-section" },
            h("h3", {}, h("span", {}, "2"), "Dirección de entrega"),
            h("label", { class: "field" }, "Dirección completa", direccion, errorDireccion))),
        h("div", { class: "sticky-col" },
          h("div", { class: "summary-card" }, resumenCompra(liquidacion)),
          h("div", { class: "order-mini" },
            h("h4", {}, `Tu pedido, ${liquidacion.total_unidades} ${liquidacion.total_unidades === 1 ? "unidad" : "unidades"}`),
            items.map((it) => h("div", {},
              portada(it.producto?.libro),
              h("span", {}, h("b", {}, it.producto?.libro?.titulo), h("small", {}, `${it.cantidad} × ${money(it.producto?.precio_base)}, ${autoresDe(it.producto?.libro)}`))))),
          boton,
          h("p", { class: "secure" }, icon("shield", 15), "Tus datos viajan cifrados y protegidos")))));
  } catch (error) {
    mount(main, errorEstado(error, cargar));
  }
}

if (pagina) cargar();
