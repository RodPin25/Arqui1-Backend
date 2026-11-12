import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Formatos extends Model {}

Formatos.init({
    id:{
        type:DataTypes.BIGINT,
        autoIncrement:true,
        primaryKey:true
    },
    codigo: {
        type:DataTypes.STRING(100),
        allowNull:false,
        unique:true,
    },
    nombre:{
        type:DataTypes.STRING(150),
        allowNull:false,
    }
},{
    sequelize,
    tableName:'formatos',
    timestamps:true,
    createdAt:'created_at'
});