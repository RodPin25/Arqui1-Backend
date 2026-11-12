import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Usuario } from "./Usuario.js";

export class PerfilInstitucional extends Model {} // Convención: PascalCase singular

PerfilInstitucional.init(
  {
    usuario_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: Usuario,
        key: "id",
      },
    },
    razon_social: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    documento_tributario: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    direccion_fiscal: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contacto_cargo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    estado_verificacion: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "pendiente",
      validate: {
        isIn: [["pendiente", "verificado", "rechazado"]],
      },
    },
  },
  {
    sequelize,
    tableName: "perfiles_institucionales",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false, // Esta tabla NO usa borrado lógico en el SQL
  }
);

// Relación 1:1 correcta (la FK 'usuario_id' vive físicamente en perfiles_institucionales)
Usuario.hasOne(PerfilInstitucional, {
  foreignKey: "usuario_id",
  as: "perfil_institucional",
});

PerfilInstitucional.belongsTo(Usuario, {
  foreignKey: "usuario_id",
  as: "usuario",
});