import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import {Usuario} from './Usuario'

export class Carritos extends Model {}

Carritos.init({
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    usuario_id:{
        type:DataTypes.BIGINT,
        allowNull:true,
        unique:true,
        references:{
            model: Usuario,
            key:'id'
        },
    },
    sesion_token:{
        type:DataTypes.STRING(100),
        allowNull:false,
    },
},{
    sequelize,
    tableName:'carritos',
    timestamps:true,
    createdAt:'created_at',
    updatedAt:'updated_at',
    paranoid:false
});

Usuario.hasOne(Carritos,{foreignKey:'usuario_id', as:'carritos'});
Carritos.belongsTo(Usuario,{foreignKey:'usuario_id', as:'usuario'});