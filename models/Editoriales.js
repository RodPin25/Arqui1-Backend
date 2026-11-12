import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class Editorial extends Model {}

Editorial.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true, 
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true, 
    },
    email_contacto: {
      type: DataTypes.STRING(150), 
      allowNull: true,             
      validate: {
        isEmail: true,
      },
    },
    sitio_web: {
      type: DataTypes.STRING(255), 
      allowNull: true,
      validate: {
        isUrl: true, 
      },
    },
  },
  {
    sequelize,
    tableName: "editoriales",
    timestamps: true,
    paranoid: true, // Activa el soft delete con deleted_at
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);