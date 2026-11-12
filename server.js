import "dotenv/config";
import app from "./app.js";
import { sequelize } from "./config/db.js";
import { inicializarRoles } from "./config/initDb.js";

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    // Prueba la conexión antes de levantar el servidor HTTP
    await sequelize.authenticate();
    console.log("Conexión a PostgreSQL (Arqui1) establecida con éxito.");

    // Inicializar roles básicos si la tabla está vacía
    await inicializarRoles();

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Prueba de salud: http://localhost:${PORT}/api/health`);
      console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/login`);
    });
  } catch (error) {
    console.error("No se pudo conectar a la base de datos:", error.message);
    process.exit(1);
  }
}

main();
