import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

// Configuración del cliente de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

/**
 * Sube un buffer de imagen directamente a Cloudinary mediante streaming
 * @param {Buffer} buffer - Buffer de la imagen en memoria
 * @param {Object} opciones - Opciones adicionales de Cloudinary (folder, public_id, etc.)
 * @returns {Promise<Object>} Resultado de la subida con secure_url y public_id
 */
export const subirACloudinary = (buffer, opciones = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "editorial_arqui1/portadas",
        resource_type: "image",
        ...opciones,
      },
      (error, result) => {
        if (error) {
          console.error("Error al subir imagen a Cloudinary:", error);
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Elimina una imagen de Cloudinary a partir de su public_id
 * @param {string} publicId
 */
export const eliminarDeCloudinary = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error al eliminar imagen de Cloudinary:", error);
    throw error;
  }
};

export default cloudinary;
