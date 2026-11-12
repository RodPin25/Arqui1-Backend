import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Rol extends Model {}

Rol.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    nombreRol: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    descricionRol : {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: false
    }
},{
    sequelize,
    tableName:'roles',
    timestamps:true,
    createdAt:'created_at',
});