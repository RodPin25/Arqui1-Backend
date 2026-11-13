import multer from "multer";

// Configuración de almacenamiento en memoria (MemoryStorage)
const storage = multer.memoryStorage();

// Filtro de validación para aceptar únicamente imágenes
const filtroImagenes = (req, file, cb) => {
  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];

  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Formato no válido. Solo se permiten imágenes (JPEG, PNG, WEBP, JPG, GIF)"), false);
  }
};

// Instancia de Multer configurada
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes límite
  },
  fileFilter: filtroImagenes,
});

/**
 * Middleware para procesar un único archivo con nombre de campo 'portada'
 */
export const uploadPortada = (req, res, next) => {
  const uploader = upload.single("portada");

  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          ok: false,
          mensaje: "El archivo es demasiado grande. El límite máximo es de 5MB.",
        });
      }
      return res.status(400).json({
        ok: false,
        mensaje: `Error en la subida del archivo: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        ok: false,
        mensaje: err.message,
      });
    }
    next();
  });
};
