import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Usuario } from "./Usuario.js";
import { Orden } from "./Orden.js";

export class Idempotencia extends Model {}

Idempotencia.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idempotency_key: {
      type: DataTypes.STRING(255),
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
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "en_proceso",
      validate: {
        isIn: [["en_proceso", "completado", "fallido"]],
      },
    },
    cuerpo_respuesta: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    orden_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: Orden,
        key: "id",
      },
    },
    expira_en: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "idempotencias",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

Usuario.hasMany(Idempotencia, { foreignKey: "usuario_id", as: "registros_idempotencia" });
Idempotencia.belongsTo(Usuario, { foreignKey: "usuario_id", as: "usuario" });

Orden.hasOne(Idempotencia, { foreignKey: "orden_id", as: "registro_idempotencia" });
Idempotencia.belongsTo(Orden, { foreignKey: "orden_id", as: "orden" });
