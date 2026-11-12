import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Autores extends Model {}

Autores.init({
    id:{
        type: DataTypes.BIGINT,
        autoIncrement:true,
        primaryKey:true
    },
    nombres:{
        type:DataTypes.STRING(150),
        allowNull:false
    },
    apellidos:{
        type:DataTypes.STRING(150),
        allowNull:false,
    },
    biografia:{
        type:DataTypes.TEXT,
        allowNull:false,
    }
},{
    sequelize,
    tableName:'autores',
    timestamps:true,
    createdAt:'created_at',
    updatedAt:'updated_at',
    deletedAt:'deleted_at'
});