import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import { Libros } from "./Libros";
import {Formatos} from "./Formatos"

export class Catalogo_Productos extends Model {}

Catalogo_Productos.init({
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    libro_id:{
        type:DataTypes.BIGINT,
        allowNull:false,
        references:{
            model:Libros,
            key:'id'
        }
    },
    formato_id:{
        type:DataTypes.BIGINT,
        allowNull:false,
        references:{
            model:Formatos,
            key:'id'
        }
    },
    isbn:{
        type:DataTypes.STRING(150),
        unique:true,
        allowNull:false
    },
    precio_base:{
        type:DataTypes.NUMBER,
        allowNull:false,
    },
    stock_disponible:{
        type:DataTypes.INTEGER,
        allowNull:false,
    },
    activo:{
        type:DataTypes.BOOLEAN,
        defaultValue:true,
        allowNull:false
    }
},{
    sequelize,
    tableName:'catalogo_productos',
    timestamps:true,
    createdAt:'created_at',
    updatedAt:'updated_at',
    deletedAt:'deleted_at'
});

// Relación con Libros (1 Libro tiene muchas variantes/productos en el catálogo)
Libros.hasMany(Catalogo_Productos, {
  foreignKey: 'libro_id',
  as: 'productos', // o 'variantes'
});

Catalogo_Productos.belongsTo(Libros, {
  foreignKey: 'libro_id',
  as: 'libro',
});

// Relación con Formatos (1 Formato aplica a muchos productos en el catálogo)
Formatos.hasMany(Catalogo_Productos, {
  foreignKey: 'formato_id',
  as: 'productos',
});

Catalogo_Productos.belongsTo(Formatos, {
  foreignKey: 'formato_id',
  as: 'formato',
});