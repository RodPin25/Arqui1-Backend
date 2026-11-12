import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Usuario } from "./Usuario.js";

export class Carritos extends Model {}

Carritos.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
      references: {
        model: Usuario,
        key: "id",
      },
    },
    sesion_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "carritos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

Usuario.hasOne(Carritos, { foreignKey: "usuario_id", as: "carrito" });
Carritos.belongsTo(Usuario, { foreignKey: "usuario_id", as: "usuario" });
