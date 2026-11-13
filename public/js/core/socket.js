// Cliente WebSocket (Socket.IO) compartido para actualizaciones en tiempo real.

import { accessToken } from "./session.js";

let cargaCliente = null;
let socketInstancia = null;

function cargarScriptSocketIO() {
  if (typeof window.io === "function") return Promise.resolve(window.io);
  cargaCliente ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/socket.io/socket.io.js";
    script.async = true;
    script.onload = () => (typeof window.io === "function" ? resolve(window.io) : reject(new Error("Socket.IO no disponible")));
    script.onerror = () => reject(new Error("No se pudo cargar /socket.io/socket.io.js"));
    document.head.appendChild(script);
  }).catch((err) => {
    cargaCliente = null;
    throw err;
  });
  return cargaCliente;
}

/**
 * Devuelve la conexión Socket.IO autenticada (o null si no hay sesión o falla la carga).
 */
export async function conectarSocket() {
  const token = accessToken();
  if (!token) return null;

  if (socketInstancia) {
    socketInstancia.auth = { token };
    if (socketInstancia.disconnected) socketInstancia.connect();
    return socketInstancia;
  }

  try {
    const io = await cargarScriptSocketIO();
    socketInstancia = io({
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketInstancia.io.on("reconnect_attempt", () => {
      const actual = accessToken();
      if (actual) socketInstancia.auth = { token: actual };
    });
    return socketInstancia;
  } catch {
    return null;
  }
}

/**
 * Suscribe un listener a un evento WebSocket. Devuelve una función para cancelar la suscripción.
 */
export async function escucharEvento(evento, manejador) {
  const socket = await conectarSocket();
  if (!socket) return () => {};
  socket.on(evento, manejador);
  return () => socket.off(evento, manejador);
}
