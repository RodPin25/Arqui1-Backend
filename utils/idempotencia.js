import crypto from "crypto";
import { Idempotencia } from "../models/Idempotencias.js";

/**
 * Módulo de Idempotencia Criptográfica con Persistencia Dual (Memoria + Base de Datos)
 * Utiliza la llave secreta IDEMPOTENCY_KEY definida en las variables de entorno (.env)
 */

// Memoria rápida para evitar consultas repetitivas a la base de datos
const registroIdempotenciaMemoria = new Map();

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
 * @returns {string} Llave de idempotencia firmada (Longitud aprox. 90-110 caracteres)
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
 * Busca primero en memoria RAM y luego en la tabla 'idempotencias' de la base de datos
 * @param {string} key - Llave de idempotencia
 */
export const obtenerRegistroIdempotente = async (key) => {
  if (!key) return null;

  // 1. Revisar caché en memoria
  const enMemoria = registroIdempotenciaMemoria.get(key);
  if (enMemoria) return enMemoria;

  // 2. Revisar persistencia en base de datos PostgreSQL
  try {
    const registroDb = await Idempotencia.findOne({
      where: { idempotency_key: key, estado: "completado" },
    });

    if (registroDb && registroDb.cuerpo_respuesta) {
      const dataObj = {
        timestamp: registroDb.created_at,
        data: registroDb.cuerpo_respuesta,
      };
      registroIdempotenciaMemoria.set(key, dataObj);
      return dataObj;
    }
  } catch (error) {
    console.error("Error al consultar idempotencia en base de datos:", error.message);
  }

  return null;
};

/**
 * Registra una respuesta exitosa bajo la llave de idempotencia
 * Guarda tanto en memoria como en la tabla relacional 'idempotencias'
 * @param {string} key - Llave de idempotencia
 * @param {Object} data - Resultado procesado (orden generada)
 * @param {number} usuarioId - ID del usuario
 * @param {number} ttlMs - Tiempo de vida en caché (24 horas por defecto)
 */
export const guardarRegistroIdempotente = async (key, data, usuarioId = null, ttlMs = 24 * 60 * 60 * 1000) => {
  if (!key) return;

  // 1. Guardar en memoria
  registroIdempotenciaMemoria.set(key, {
    timestamp: Date.now(),
    data,
  });

  // Limpieza automática en memoria tras el TTL
  setTimeout(() => {
    registroIdempotenciaMemoria.delete(key);
  }, ttlMs).unref?.();

  // 2. Persistir en la base de datos PostgreSQL
  try {
    const ordenId = data?.orden?.id || null;
    const usrId = usuarioId || data?.orden?.usuario_id || null;

    if (usrId) {
      await Idempotencia.upsert({
        idempotency_key: key,
        usuario_id: usrId,
        estado: "completado",
        cuerpo_respuesta: data,
        orden_id: ordenId,
        expira_en: new Date(Date.now() + ttlMs),
      });
    }
  } catch (error) {
    console.error("Error al persistir registro de idempotencia en BD:", error.message);
  }
};
