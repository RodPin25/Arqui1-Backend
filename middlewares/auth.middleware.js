import jwt from "jsonwebtoken";

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
 * Middleware para restringir acceso por roles
 * @param  {...string} rolesPermitidos - Nombres de roles permitidos (ej. 'ADMIN', 'CLIENTE')
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
    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso denegado: se requiere uno de los roles [${rolesPermitidos.join(", ")}]`,
      });
    }

    next();
  };
};
