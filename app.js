import express from "express";
import cors from "cors";
import { sequelize } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Endpoint de prueba de salud y conexión a PostgreSQL
app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({
      ok: true,
      mensaje: "Servidor Express y PostgreSQL (Arqui1) conectados correctamente",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error de conexión con la base de datos",
      error: error.message,
    });
  }
});

// Rutas de autenticación
app.use("/api/auth", authRoutes);

export default app;
