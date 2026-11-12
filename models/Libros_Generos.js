import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import { Libros } from './Libros';
import { Generos } from "./Generos";

export class Libros_Generos extends Model {}

Libros_Generos.init({
    libro_id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        references:{
            model:Libros,
            key:'id'
        }
    },
    genero_id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        references:{
            model:Generos,
            key:'id'
        }
    }
},{
    sequelize,
    tableName:'libros_generos',
    timestamps:false
});

Libros.belongsToMany(Generos,{
    through:Libros_Generos,
    foreignKey:'libro_id',
    otherKey:'genero_id',
    as:'generos'
});

Generos.belongsToMany(Libros,{
    through:Libros_Generos,
    foreignKey:'genero_id',
    otherKey:'libro_id',
    as:'libros'
});