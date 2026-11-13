import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import catalogoRoutes from "./routes/catalogo.routes.js";
import carritoRoutes from "./routes/carrito.routes.js";
import ordenRoutes from "./routes/orden.routes.js";
import cotizacionRoutes from "./routes/cotizacion.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import autorRoutes from "./routes/autor.routes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./config/swagger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la capa de Vista (View) estática y responsiva de la plataforma MVC
app.use(express.static(path.join(__dirname, "public")));

// Documentación Interactiva Swagger / OpenAPI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/api-docs.json", (req, res) => res.json(swaggerDocument));

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

// Rutas API principales del Controlador
app.use("/api/auth", authRoutes);
app.use("/api/catalogo", catalogoRoutes);
app.use("/api/carrito", carritoRoutes);
app.use("/api/ordenes", ordenRoutes);
app.use("/api/cotizaciones", cotizacionRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/autores", autorRoutes);

export default app;
