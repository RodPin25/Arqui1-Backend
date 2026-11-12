import jwt from "jsonwebtoken";

const aliasMap = {
  CLIENTE: ["CLIENTE", "CLIENTE_MINORISTA"],
  CLIENTE_MINORISTA: ["CLIENTE", "CLIENTE_MINORISTA"],
  CLIENTE_INSTITUCIONAL: ["CLIENTE_INSTITUCIONAL", "MAYORISTA"],
  MAYORISTA: ["CLIENTE_INSTITUCIONAL", "MAYORISTA"],
  ASESOR: ["ASESOR", "ASESOR_VENTAS"],
  ASESOR_VENTAS: ["ASESOR", "ASESOR_VENTAS"],
  ADMIN: ["ADMIN", "ADMINISTRADOR"],
  ADMINISTRADOR: ["ADMIN", "ADMINISTRADOR"],
};

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (!token) {
    return res.status(401).json({
      ok: false,
      mensaje: "Acceso denegado: no se proporcionó token de autenticación",
    });
  }

  try {
    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
      console.error("ERROR: SECRET_KEY no está configurada en las variables de entorno");
      return res.status(500).json({ ok: false, mensaje: "Error de configuración en el servidor" });
    }

    const decoded = jwt.verify(token, secretKey);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      ok: false,
      mensaje: "Token inválido o expirado",
      error: error.message,
    });
  }
};

/**
 * Middleware para rutas que pueden ser accedidas tanto por visitantes anónimos como por autenticados
 */
export const opcionalToken = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (!token) {
    req.usuario = null;
    return next();
  }

  try {
    const secretKey = process.env.SECRET_KEY;
    const decoded = jwt.verify(token, secretKey);
    req.usuario = decoded;
  } catch (err) {
    req.usuario = null;
  }
  next();
};

/**
 * Middleware para restringir acceso por roles
 * @param  {...string} rolesPermitidos - Nombres de roles permitidos (ej. 'ADMIN', 'CLIENTE_MINORISTA')
 */
export const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario no autenticado",
      });
    }

    const rolUsuario = req.usuario.rol;
    const expandedPermitidos = new Set();
    rolesPermitidos.forEach((rol) => {
      expandedPermitidos.add(rol);
      if (aliasMap[rol]) {
        aliasMap[rol].forEach((r) => expandedPermitidos.add(r));
      }
    });

    if (!rolUsuario || !expandedPermitidos.has(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado: se requiere uno de los roles [${rolesPermitidos.join(", ")}]`,
      });
    }

    next();
  };
};
