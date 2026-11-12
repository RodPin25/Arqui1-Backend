import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario, Rol, Carritos } from "../models/index.js";

// Helper para generar tokens JWT
const generarTokens = (usuario) => {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol ? usuario.rol.nombre : null,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
  };

  const accessToken = jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: "2h",
  });

  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

/**
 * Registro de un nuevo usuario
 */
export const registrar = async (req, res) => {
  try {
    const { email, password, nombres, apellidos, telefono, rol: rolNombre } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombres || !apellidos) {
      return res.status(400).json({
        ok: false,
        mensaje: "Los campos email, password, nombres y apellidos son obligatorios",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Verificar si el correo ya está registrado
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(409).json({
        ok: false,
        mensaje: "El correo electrónico ya está registrado",
      });
    }

    // Determinar el rol (por defecto 'CLIENTE')
    const nombreRolBuscado = (rolNombre || "CLIENTE").toUpperCase();
    let rol = await Rol.findOne({ where: { nombre: nombreRolBuscado } });
    if (!rol) {
      // Si el rol aún no existe, lo creamos
      rol = await Rol.create({
        nombre: nombreRolBuscado,
        descripcion: `Rol ${nombreRolBuscado}`,
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Crear usuario
    const nuevoUsuario = await Usuario.create({
      rol_id: rol.id,
      email: email.trim().toLowerCase(),
      password_hash,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      telefono: telefono ? telefono.trim() : null,
      activo: true,
    });

    // Si es un cliente, crear automáticamente su carrito de compras
    if (rol.nombre === "CLIENTE") {
      await Carritos.findOrCreate({
        where: { usuario_id: nuevoUsuario.id },
        defaults: { usuario_id: nuevoUsuario.id },
      });
    }

    // Traer el usuario con su rol asociado
    const usuarioCompleto = await Usuario.findByPk(nuevoUsuario.id, {
      include: [{ model: Rol, as: "rol", attributes: ["id", "nombre", "descripcion"] }],
    });

    // Generar tokens
    const tokens = generarTokens(usuarioCompleto);

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario registrado exitosamente",
      data: {
        usuario: usuarioCompleto,
        tokens,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al registrar usuario",
      error: error.message,
    });
  }
};

/**
 * Inicio de sesión (Login)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debe proporcionar email y password",
      });
    }

    // Buscar al usuario por correo
    const usuario = await Usuario.findOne({
      where: { email: email.trim().toLowerCase() },
      include: [{ model: Rol, as: "rol", attributes: ["id", "nombre", "descripcion"] }],
    });

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales inválidas",
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        ok: false,
        mensaje: "La cuenta de usuario se encuentra inactiva",
      });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({
        ok: false,
        mensaje: "Credenciales inválidas",
      });
    }

    // Generar tokens
    const tokens = generarTokens(usuario);

    return res.status(200).json({
      ok: true,
      mensaje: "Inicio de sesión exitoso",
      data: {
        usuario,
        tokens,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno en el inicio de sesión",
      error: error.message,
    });
  }
};

/**
 * Renovación de token (Refresh Token)
 */
export const refrescarToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        mensaje: "El refreshToken es requerido",
      });
    }

    // Verificar firma del refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);

    // Buscar usuario en BD para confirmar que siga activo
    const usuario = await Usuario.findByPk(decoded.id, {
      include: [{ model: Rol, as: "rol", attributes: ["id", "nombre", "descripcion"] }],
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario no autorizado o inactivo",
      });
    }

    // Generar nuevos tokens
    const tokens = generarTokens(usuario);

    return res.status(200).json({
      ok: true,
      mensaje: "Token renovado exitosamente",
      data: {
        tokens,
      },
    });
  } catch (error) {
    return res.status(403).json({
      ok: false,
      mensaje: "Refresh token inválido o expirado",
      error: error.message,
    });
  }
};

/**
 * Obtener perfil del usuario autenticado
 */
export const obtenerPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const usuario = await Usuario.findByPk(usuarioId, {
      include: [
        { model: Rol, as: "rol", attributes: ["id", "nombre", "descripcion"] },
        { model: Carritos, as: "carrito" },
      ],
    });

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      data: usuario,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al obtener perfil del usuario",
      error: error.message,
    });
  }
};
