import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Usuario } from "./Usuario.js";

import { Carritos } from "./Carritos.js";

export class Orden extends Model {
  /**
   * Cálculo de totales y liquidación de orden mediante la lógica del Modelo
   */
  static calcularTotales(params) {
    return Carritos.calcularTotales(params);
  }
}

Orden.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    numero_orden: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    usuario_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Usuario,
        key: "id",
      },
    },
    subtotal_base: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    descuento_volumen: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    porcentaje_descuento_volumen: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    descuento_institucional: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    porcentaje_descuento_institucional: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    total_impuestos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    total_final: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Pendiente",
      validate: {
        isIn: [["Pendiente", "Aprobado", "Enviado", "Cancelado"]],
      },
    },
    direccion_entrega: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    idempotency_key: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    fecha_orden: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "ordenes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

// Relaciones
Usuario.hasMany(Orden, { foreignKey: "usuario_id", as: "ordenes" });
Orden.belongsTo(Usuario, { foreignKey: "usuario_id", as: "usuario" });