import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Libros extends Model {}

Libros.init({
    id:{
        type: DataTypes.BIGINT,
        autoIncrement:true,
        primaryKey:true
    },
    titulo: {
        type: DataTypes.STRING(150),
        allowNull:false
    },
    sinopsis:{
        type: DataTypes.TEXT,
        allowNull:false,
    },
    anio_edicion:{
        type:DataTypes.SMALLINT,
        allowNull:false,
        validate:{
            min:1400,
            max:2100
        }
    },
    portada_url:{
        type:DataTypes.TEXT,
        allowNull:false,
        validate:{ isUrl:true }
    },
    activo:{
        type:DataTypes.BOOLEAN,
        defaultValue:true,
        allowNull:false,
    }
},{
    sequelize,
    tableName:'libros',
    timestamps:true,
    createdAt:'created_at',
    updatedAt:'updated_at',
    deletedAt:'deleted_at'
});