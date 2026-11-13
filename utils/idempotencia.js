import crypto from "crypto";

/**
 * Módulo de Idempotencia Criptográfica
 * Utiliza la llave secreta IDEMPOTENCY_KEY definida en las variables de entorno (.env)
 */

// Memoria para control de idempotencia y respuestas cacheadas (evita duplicidad de transacciones)
const registroIdempotencia = new Map();

/**
 * Obtener la clave secreta de idempotencia desde el entorno
 */
const obtenerClaveIdempotencia = () => {
  const key = process.env.IDEMPOTENCY_KEY;
  if (!key) {
    console.warn("⚠️ AVISO: IDEMPOTENCY_KEY no está definida en .env. Se usará una clave de respaldo.");
    return "clave-respaldo-idempotencia-arqui1-2026";
  }
  return key;
};

/**
 * Genera una llave de idempotencia única y firmada criptográficamente (HMAC-SHA256)
 * @param {string|number} usuarioId - ID del usuario autenticado
 * @param {string|number} carritoId - ID del carrito
 * @param {number} timestamp - Marca de tiempo
 * @returns {string} Llave de idempotencia firmada
 */
export const generarIdempotencyKey = (usuarioId, carritoId, timestamp = Date.now()) => {
  const secretKey = obtenerClaveIdempotencia();
  const payload = `usr:${usuarioId}|car:${carritoId}|ts:${timestamp}|rnd:${crypto.randomBytes(8).toString("hex")}`;
  
  // Generar firma HMAC con la IDEMPOTENCY_KEY del entorno
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  // Formato: base64(payload).signature
  const encodedPayload = Buffer.from(payload).toString("base64url");
  return `IDEMP_${encodedPayload}.${signature.substring(0, 32)}`;
};

/**
 * Valida la autenticidad e integridad de una llave de idempotencia
 * @param {string} idempotencyKey - Llave enviada por el cliente o generada
 * @returns {boolean} True si es válida o tiene formato válido
 */
export const validarFormatoIdempotencyKey = (idempotencyKey) => {
  if (!idempotencyKey || typeof idempotencyKey !== "string") return false;
  if (!idempotencyKey.startsWith("IDEMP_")) return false;

  const parts = idempotencyKey.replace("IDEMP_", "").split(".");
  if (parts.length !== 2) return false;

  try {
    const [encodedPayload, signatureRecibida] = parts;
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const secretKey = obtenerClaveIdempotencia();

    const signatureCalculada = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("hex")
      .substring(0, 32);

    return crypto.timingSafeEqual(
      Buffer.from(signatureRecibida),
      Buffer.from(signatureCalculada)
    );
  } catch (error) {
    return false;
  }
};

/**
 * Consulta si una operación con esta llave de idempotencia ya fue procesada
 * @param {string} key - Llave de idempotencia
 */
export const obtenerRegistroIdempotente = (key) => {
  if (!key) return null;
  return registroIdempotencia.get(key) || null;
};

/**
 * Registra una respuesta exitosa bajo la llave de idempotencia para respuestas repetidas
 * @param {string} key - Llave de idempotencia
 * @param {Object} data - Resultado procesado (orden generada)
 * @param {number} ttlMs - Tiempo de vida en caché (por defecto 24 horas)
 */
export const guardarRegistroIdempotente = (key, data, ttlMs = 24 * 60 * 60 * 1000) => {
  if (!key) return;
  registroIdempotencia.set(key, {
    timestamp: Date.now(),
    data,
  });

  // Limpieza automática tras el TTL
  setTimeout(() => {
    registroIdempotencia.delete(key);
  }, ttlMs).unref?.();
};
