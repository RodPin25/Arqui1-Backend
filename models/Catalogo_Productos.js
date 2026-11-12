import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Libros } from "./Libros.js";
import { Formatos } from "./Formatos.js";

export class Catalogo_Productos extends Model {}

Catalogo_Productos.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    libro_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Libros,
        key: "id",
      },
    },
    formato_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Formatos,
        key: "id",
      },
    },
    isbn: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
    },
    precio_base: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    stock_disponible: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "catalogo_productos",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

Libros.hasMany(Catalogo_Productos, {
  foreignKey: "libro_id",
  as: "productos",
});

Catalogo_Productos.belongsTo(Libros, {
  foreignKey: "libro_id",
  as: "libro",
});

Formatos.hasMany(Catalogo_Productos, {
  foreignKey: "formato_id",
  as: "productos",
});

Catalogo_Productos.belongsTo(Formatos, {
  foreignKey: "formato_id",
  as: "formato",
});
