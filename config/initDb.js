import { Rol } from "../models/Rol.js";

export const inicializarRoles = async () => {
  try {
    const rolesDefinidos = [
      { nombre: "CLIENTE_MINORISTA", descripcion: "Cliente minorista con compras individuales" },
      { nombre: "CLIENTE_INSTITUCIONAL", descripcion: "Cliente corporativo o institucional para compras a volumen" },
      { nombre: "ASESOR", descripcion: "Asesor de ventas y gestión de cotizaciones" },
      { nombre: "ADMIN", descripcion: "Administrador con control total del sistema" },
      // Compatibilidad con registros existentes:
      { nombre: "CLIENTE", descripcion: "Cliente general (alias minorista)" },
    ];

    for (const rol of rolesDefinidos) {
      await Rol.findOrCreate({
        where: { nombre: rol.nombre },
        defaults: rol,
      });
    }
    console.log("✅ Roles iniciales asegurados en la base de datos.");
  } catch (error) {
    console.error("⚠️ Error inicializando roles por defecto:", error.message);
  }
};
