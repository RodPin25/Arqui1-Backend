import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Usuario } from "./Usuario.js";
import { Libros } from "./Libros.js";

export class CotizacionSolicitud extends Model {}

CotizacionSolicitud.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo_solicitud: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    cliente_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Usuario,
        key: "id",
      },
    },
    libro_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: Libros,
        key: "id",
      },
    },
    titulo_obra: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    cantidad_estimada: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    acabado_portada: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tipo_papel: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fecha_entrega_requerida: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    notas_cliente: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Pendiente",
      validate: {
        isIn: [[
          "Pendiente",
          "En Revisión",
          "Cotizada",
          "Aprobada por Cliente",
          "Rechazada por Cliente",
          "Cancelada",
        ]],
      },
    },
    asesor_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: Usuario,
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "cotizaciones_solicitudes",
    timestamps: true,
    paranoid: true, // Sí tiene deleted_at en el SQL
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Relaciones
Usuario.hasMany(CotizacionSolicitud, { foreignKey: "cliente_id", as: "solicitudes_cliente" });
CotizacionSolicitud.belongsTo(Usuario, { foreignKey: "cliente_id", as: "cliente" });

Usuario.hasMany(CotizacionSolicitud, { foreignKey: "asesor_id", as: "solicitudes_asignadas" });
CotizacionSolicitud.belongsTo(Usuario, { foreignKey: "asesor_id", as: "asesor" });

Libros.hasMany(CotizacionSolicitud, { foreignKey: "libro_id", as: "cotizaciones" });
CotizacionSolicitud.belongsTo(Libros, { foreignKey: "libro_id", as: "libro" });