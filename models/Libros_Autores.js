import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Autor } from "./Autor.js";
import { Libro } from "./Libro.js";

export class LibrosAutores extends Model {}

LibrosAutores.init(
  {
    libro_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: Libro,
        key: "id",
      },
    },
    autor_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: Autor,
        key: "id",
      },
    },
    orden_autoria: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 1, // DEFAULT 1 en tu SQL
    },
  },
  {
    sequelize,
    tableName: "libros_autores",
    timestamps: false, // La tabla pivote no tiene created_at ni updated_at en el SQL
  }
);

// Definición de la relación Muchos a Muchos (N:M)
Libro.belongsToMany(Autor, {
  through: LibrosAutores,
  foreignKey: "libro_id",
  otherKey: "autor_id",
  as: "autores",
});

Autor.belongsToMany(Libro, {
  through: LibrosAutores,
  foreignKey: "autor_id",
  otherKey: "libro_id",
  as: "libros",
});