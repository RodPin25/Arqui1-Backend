import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Usuario } from "./Usuario.js";
import { Orden } from "./Orden.js";

export class CheckoutSesion extends Model {
  /**
   * Verifica si la sesión ha expirado (periodo límite de 10 minutos)
   */
  estaExpirada() {
    if (this.estado === "expirada") return true;
    if (this.estado === "completada" || this.estado === "cancelada") return false;
    return new Date() > new Date(this.expira_en);
  }

  /**
   * Calcula los segundos restantes del periodo de 10 minutos
   */
  tiempoRestanteSegundos() {
    if (this.estado !== "iniciada") return 0;
    const diffMs = new Date(this.expira_en).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  }
}

CheckoutSesion.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Usuario,
        key: "id",
      },
    },
    token_sesion: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    idempotency_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    expira_en: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "iniciada",
      validate: {
        isIn: [["iniciada", "completada", "expirada", "cancelada"]],
      },
    },
    subtotal_base: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    descuento_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_impuestos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_final: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_unidades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    detalles_items: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    desglose_reglas: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    orden_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: Orden,
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "checkout_sesiones",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

Usuario.hasMany(CheckoutSesion, { foreignKey: "usuario_id", as: "checkout_sesiones" });
CheckoutSesion.belongsTo(Usuario, { foreignKey: "usuario_id", as: "usuario" });

Orden.hasOne(CheckoutSesion, { foreignKey: "orden_id", as: "checkout_sesion" });
CheckoutSesion.belongsTo(Orden, { foreignKey: "orden_id", as: "orden" });
