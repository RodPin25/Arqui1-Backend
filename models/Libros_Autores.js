import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Autores } from "./Autores.js";
import { Libros } from "./Libros.js";

export class LibrosAutores extends Model {}

LibrosAutores.init(
  {
    libro_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: Libros,
        key: "id",
      },
    },
    autor_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: Autores,
        key: "id",
      },
    },
    orden_autoria: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: "libros_autores",
    timestamps: false,
    paranoid: false,
  }
);

Libros.belongsToMany(Autores, {
  through: LibrosAutores,
  foreignKey: "libro_id",
  otherKey: "autor_id",
  as: "autores",
});

Autores.belongsToMany(Libros, {
  through: LibrosAutores,
  foreignKey: "autor_id",
  otherKey: "libro_id",
  as: "libros",
});
