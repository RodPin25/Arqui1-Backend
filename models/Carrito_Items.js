import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Carritos } from "./Carritos.js";
import { Catalogo_Productos } from "./Catalogo_Productos.js";

export class CarritoItem extends Model {}

CarritoItem.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    carrito_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Carritos,
        key: "id",
      },
    },
    producto_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Catalogo_Productos,
        key: "id",
      },
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
  },
  {
    sequelize,
    tableName: "carrito_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

Carritos.hasMany(CarritoItem, { foreignKey: "carrito_id", as: "items" });
CarritoItem.belongsTo(Carritos, { foreignKey: "carrito_id", as: "carrito" });

Catalogo_Productos.hasMany(CarritoItem, { foreignKey: "producto_id", as: "en_carritos" });
CarritoItem.belongsTo(Catalogo_Productos, { foreignKey: "producto_id", as: "producto" });
