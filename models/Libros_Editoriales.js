import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import { Libros } from "./Libros";
import {Editorial} from './Editoriales';

export class Libros_Editoriales extends Model {}

Libros_Editoriales.init({
    libro_id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        references:{
            model:Libros,
            key:'id'
        }
    },
    editorial_id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        references:{
            model:Editorial,
            key:'id'
        }
    }
},{
    sequelize,
    tableName:'libros_editoriales',
    timestamps:false
});

Libros.belongsToMany(Editorial,{
    through:Libros_Editoriales,
    foreignKey:'libro_id',
    otherKey:'editorial_id',
    as:'editoriales'
});
Editorial.belongsToMany(Libros,{
    through:Libros_Editoriales,
    foreignKey:'editorial_id',
    otherKey:'libro_id',
    as:'libros'
});