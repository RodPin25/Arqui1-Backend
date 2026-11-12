import { Rol } from "../models/Rol.js";

export const inicializarRoles = async () => {
  try {
    const conteo = await Rol.count();
    if (conteo === 0) {
      console.log("ℹ️ No hay roles registrados. Creando roles por defecto...");
      await Rol.bulkCreate([
        { nombre: "CLIENTE", descripcion: "Cliente de la tienda de libros" },
        { nombre: "ADMIN", descripcion: "Administrador de la plataforma" },
        { nombre: "ASESOR", descripcion: "Asesor de ventas y cotizaciones" },
      ]);
      console.log("✅ Roles iniciales creados: CLIENTE, ADMIN, ASESOR.");
    }
  } catch (error) {
    console.error("⚠️ Error inicializando roles por defecto:", error.message);
  }
};
