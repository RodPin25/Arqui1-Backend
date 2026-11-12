import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario, Rol, Carritos, PerfilInstitucional } from "../models/index.js";

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
 * Soporta clientes minoristas y clientes institucionales (con perfil corporativo)
 */
export const registrar = async (req, res) => {
  try {
    const {
      email,
      password,
      nombres,
      apellidos,
      telefono,
      rol: rolNombre,
      razon_social,
      documento_tributario,
      direccion_fiscal,
      contacto_cargo,
    } = req.body;

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

    // Determinar el rol (por defecto 'CLIENTE_MINORISTA')
    let nombreRolBuscado = (rolNombre || "CLIENTE_MINORISTA").toUpperCase();
    if (nombreRolBuscado === "CLIENTE") nombreRolBuscado = "CLIENTE_MINORISTA";

    let rol = await Rol.findOne({ where: { nombre: nombreRolBuscado } });
    if (!rol) {
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

    // Si es cliente institucional, crear su Perfil Institucional
    if (["CLIENTE_INSTITUCIONAL", "MAYORISTA"].includes(rol.nombre)) {
      if (!razon_social || !documento_tributario || !direccion_fiscal) {
        return res.status(400).json({
          ok: false,
          mensaje: "Para el registro institucional se requiere razon_social, documento_tributario y direccion_fiscal",
        });
      }

      await PerfilInstitucional.create({
        usuario_id: nuevoUsuario.id,
        razon_social: razon_social.trim(),
        documento_tributario: documento_tributario.trim(),
        direccion_fiscal: direccion_fiscal.trim(),
        contacto_cargo: contacto_cargo ? contacto_cargo.trim() : "Representante Legal",
        estado_verificacion: "pendiente",
      });
    }

    // Si es cualquier tipo de cliente (minorista o institucional), crear automáticamente su carrito
    if (["CLIENTE", "CLIENTE_MINORISTA", "CLIENTE_INSTITUCIONAL", "MAYORISTA"].includes(rol.nombre)) {
      await Carritos.findOrCreate({
        where: { usuario_id: nuevoUsuario.id },
        defaults: { usuario_id: nuevoUsuario.id },
      });
    }

    // Traer el usuario con su rol y perfil institucional si aplica
    const usuarioCompleto = await Usuario.findByPk(nuevoUsuario.id, {
      include: [
        { model: Rol, as: "rol", attributes: ["id", "nombre", "descripcion"] },
        { model: PerfilInstitucional, as: "perfil_institucional" },
      ],
      attributes: { exclude: ["password_hash"] },
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
        { model: PerfilInstitucional, as: "perfil_institucional" },
      ],
      attributes: { exclude: ["password_hash"] },
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

/**
 * Listar todos los usuarios (Exclusivo Administrador)
 */
export const listarUsuarios = async (req, res) => {
  try {
    const { rol_id, activo } = req.query;
    const where = {};
    if (rol_id) where.rol_id = rol_id;
    if (activo !== undefined) where.activo = activo === "true" || activo === true;

    const usuarios = await Usuario.findAll({
      where,
      include: [
        { model: Rol, as: "rol", attributes: ["id", "nombre", "descripcion"] },
        { model: PerfilInstitucional, as: "perfil_institucional" },
      ],
      attributes: { exclude: ["password_hash"] },
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      ok: true,
      total: usuarios.length,
      data: usuarios,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al listar usuarios",
      error: error.message,
    });
  }
};

/**
 * Actualizar rol o estado activo de un usuario (Exclusivo Administrador)
 */
export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol_id, activo, nombres, apellidos, telefono } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    }

    if (rol_id) usuario.rol_id = rol_id;
    if (activo !== undefined) usuario.activo = Boolean(activo);
    if (nombres) usuario.nombres = nombres.trim();
    if (apellidos) usuario.apellidos = apellidos.trim();
    if (telefono !== undefined) usuario.telefono = telefono;

    await usuario.save();

    const actualizado = await Usuario.findByPk(id, {
      include: [
        { model: Rol, as: "rol", attributes: ["id", "nombre", "descripcion"] },
        { model: PerfilInstitucional, as: "perfil_institucional" },
      ],
      attributes: { exclude: ["password_hash"] },
    });

    return res.status(200).json({
      ok: true,
      mensaje: "Usuario actualizado correctamente",
      data: actualizado,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al actualizar usuario",
      error: error.message,
    });
  }
};

/**
 * Listar perfiles institucionales para revisión (Admin / Asesor)
 */
export const listarPerfilesInstitucionales = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado_verificacion = estado;

    const perfiles = await PerfilInstitucional.findAll({
      where,
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "email", "nombres", "apellidos", "telefono", "activo"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      ok: true,
      total: perfiles.length,
      data: perfiles,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al listar perfiles institucionales",
      error: error.message,
    });
  }
};

/**
 * Verificar o rechazar un perfil institucional (Admin / Asesor)
 */
export const verificarPerfilInstitucional = async (req, res) => {
  try {
    const { usuario_id } = req.params;
    const { estado_verificacion } = req.body;

    if (!["verificado", "rechazado", "pendiente"].includes(estado_verificacion)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El estado de verificación debe ser: verificado, rechazado o pendiente",
      });
    }

    const perfil = await PerfilInstitucional.findByPk(usuario_id);
    if (!perfil) {
      return res.status(404).json({ ok: false, mensaje: "Perfil institucional no encontrado" });
    }

    perfil.estado_verificacion = estado_verificacion;
    await perfil.save();

    return res.status(200).json({
      ok: true,
      mensaje: `Perfil institucional marcado como ${estado_verificacion}`,
      data: perfil,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error al verificar perfil institucional",
      error: error.message,
    });
  }
};
