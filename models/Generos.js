import { DataTypes,Model } from "sequelize";
import { sequelize } from "../config/db";

export class Generos extends Model {}

Generos.init({
    id : {
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    nombre:{
        type:DataTypes.STRING(150),
        unique:true,
        allowNull:false,
    },
    descripcion: {
        type:DataTypes.TEXT,
        allowNull:false,
    },
},{
    sequelize,
    tableName:'generos',
    timestamps:true,
    createdAt:'created_at',
    updatedAt:'updated_ap',
    deletedAt:'deleted_at'
});