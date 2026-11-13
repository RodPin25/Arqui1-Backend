import "dotenv/config";
import http from "http";
import app from "./app.js";
import { sequelize } from "./config/db.js";
import { inicializarRoles } from "./config/initDb.js";
import { initSocketServer } from "./services/socket.service.js";

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    // Prueba la conexión antes de levantar el servidor HTTP
    await sequelize.authenticate();
    console.log("Conexión a PostgreSQL (Arqui1) establecida con éxito.");

    // Inicializar roles básicos si la tabla está vacía
    await inicializarRoles();

    // Crear servidor HTTP para adjuntar Express y WebSockets
    const httpServer = http.createServer(app);

    // Inicializar servidor WebSocket (Socket.IO)
    initSocketServer(httpServer);
    console.log("Servidor WebSocket (Socket.IO) inicializado correctamente.");

    let puertoActual = parseInt(PORT, 10) || 3000;

    const iniciarEscucha = (puerto) => {
      httpServer.listen(puerto, () => {
        console.log(`🚀 Servidor HTTP + WebSockets corriendo en http://localhost:${puerto}`);
        console.log(`Prueba de salud: http://localhost:${puerto}/api/health`);
        console.log(`Auth endpoints: http://localhost:${puerto}/api/auth/login`);
        console.log(`Reportería en vivo: http://localhost:${puerto}/api/reportes/dashboard`);
      });
    };

    httpServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Puerto ${puertoActual} ocupado. Reintentando automáticamente en el puerto ${puertoActual + 1}...`);
        puertoActual += 1;
        iniciarEscucha(puertoActual);
      } else {
        console.error("Error al iniciar el servidor HTTP:", err.message);
        process.exit(1);
      }
    });

    iniciarEscucha(puertoActual);
  } catch (error) {
    console.error("No se pudo conectar a la base de datos:", error.message);
    process.exit(1);
  }
}

main();
