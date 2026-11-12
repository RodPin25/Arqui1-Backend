import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Rol } from "./Rol.js";

export class Usuario extends Model {
  toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
  }
}

Usuario.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    rol_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Rol,
        key: "id",
      },
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nombres: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    apellidos: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    paranoid: true,
    timestamps: true,
    tableName: "usuarios",
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

Rol.hasMany(Usuario, { foreignKey: "rol_id", as: "usuarios" });
Usuario.belongsTo(Rol, { foreignKey: "rol_id", as: "rol" });
