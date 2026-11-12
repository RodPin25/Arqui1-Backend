import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Orden } from "./Orden.js";
import { Catalogo_Productos } from "./Catalogo_Productos.js";

export class OrdenDetalle extends Model {}

OrdenDetalle.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    orden_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Orden,
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
      validate: { min: 1 },
    },
    precio_unitario_historico: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    subtotal_linea: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },
  },
  {
    sequelize,
    tableName: "orden_detalles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false, // No existe updated_at en esta tabla
    paranoid: false,
  }
);

// Relaciones
Orden.hasMany(OrdenDetalle, { foreignKey: "orden_id", as: "detalles" });
OrdenDetalle.belongsTo(Orden, { foreignKey: "orden_id", as: "orden" });

Catalogo_Productos.hasMany(OrdenDetalle, { foreignKey: "producto_id", as: "ventas_detalle" });
OrdenDetalle.belongsTo(Catalogo_Productos, { foreignKey: "producto_id", as: "producto" });