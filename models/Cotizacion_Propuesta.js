import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { CotizacionSolicitud } from "./Cotizacion_Solicitud.js";
import { Usuario } from "./Usuario.js";

export class CotizacionPropuesta extends Model {}

CotizacionPropuesta.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    solicitud_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: CotizacionSolicitud,
        key: "id",
      },
    },
    asesor_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Usuario,
        key: "id",
      },
    },
    costo_unitario_ofrecido: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    costo_total_propuesto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    tiempo_entrega_dias: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    condiciones_comerciales: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fecha_validez: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Emitida",
      validate: {
        isIn: [["Emitida", "Aceptada", "Vencida", "Cancelada"]],
      },
    },
  },
  {
    sequelize,
    tableName: "cotizaciones_propuestas",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

CotizacionSolicitud.hasMany(CotizacionPropuesta, { foreignKey: "solicitud_id", as: "propuestas" });
CotizacionPropuesta.belongsTo(CotizacionSolicitud, { foreignKey: "solicitud_id", as: "solicitud" });

Usuario.hasMany(CotizacionPropuesta, { foreignKey: "asesor_id", as: "propuestas_creadas" });
CotizacionPropuesta.belongsTo(Usuario, { foreignKey: "asesor_id", as: "asesor" });
