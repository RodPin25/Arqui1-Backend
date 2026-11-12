import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import { Usuario } from "./Usuario.js";

export class Carritos extends Model {
  /**
   * Lógica de cálculo de reglas de negocio dinámicas de descuentos según RF-03.2.
   * Ejecutada estrictamente dentro de la capa del Modelo.
   * @param {Object} params
   * @param {Array} params.items - Lista de { cantidad, precio_unitario }
   * @param {string} params.rolNombre - Rol del cliente (ej. CLIENTE_MINORISTA, CLIENTE_INSTITUCIONAL)
   * @param {number} params.tasaImpuesto - Tasa de impuesto (por defecto 0.12 para IVA 12%)
   */
  static calcularTotales({ items = [], rolNombre = "CLIENTE_MINORISTA", tasaImpuesto = 0.12 }) {
    const totalUnidades = items.reduce((acc, it) => acc + (parseInt(it.cantidad, 10) || 0), 0);
    const subtotalBase = items.reduce((acc, it) => {
      const cant = parseInt(it.cantidad, 10) || 0;
      const precio = parseFloat(it.precio_unitario ?? it.precio_base ?? 0);
      return acc + (cant * precio);
    }, 0);

    // 1. Regla de Descuento por Volumen (1 a 5: 0%, 6 a 20: 5%, 21 a 50: 10%, >50: 15%)
    let porcentajeVolumen = 0;
    let reglaVolumenDetalle = "1 a 5 unidades: 0% de descuento";
    if (totalUnidades >= 6 && totalUnidades <= 20) {
      porcentajeVolumen = 0.05;
      reglaVolumenDetalle = "6 a 20 unidades: 5% de descuento sobre el subtotal";
    } else if (totalUnidades >= 21 && totalUnidades <= 50) {
      porcentajeVolumen = 0.10;
      reglaVolumenDetalle = "21 a 50 unidades: 10% de descuento sobre el subtotal";
    } else if (totalUnidades > 50) {
      porcentajeVolumen = 0.15;
      reglaVolumenDetalle = "Más de 50 unidades: 15% de descuento sobre el subtotal";
    }

    const montoDescuentoVolumen = +(subtotalBase * porcentajeVolumen).toFixed(2);
    const subtotalTrasVolumen = +(subtotalBase - montoDescuentoVolumen).toFixed(2);

    // 2. Regla de Descuento Adicional por Tipo de Cliente (Institucional/Mayorista: 8% adicional acumulativo)
    const esInstitucional = ["CLIENTE_INSTITUCIONAL", "MAYORISTA"].includes((rolNombre || "").toUpperCase());
    const porcentajeInstitucional = esInstitucional ? 0.08 : 0.0;
    const reglaInstitucionalDetalle = esInstitucional
      ? "Cliente Institucional/Mayorista: 8% adicional acumulable tras volumen"
      : "Cliente Minorista: 0% adicional";

    const montoDescuentoInstitucional = +(subtotalTrasVolumen * porcentajeInstitucional).toFixed(2);
    const totalDescuentos = +(montoDescuentoVolumen + montoDescuentoInstitucional).toFixed(2);

    // 3. Subtotal Neto
    const subtotalNeto = +(subtotalBase - totalDescuentos).toFixed(2);

    // 4. Impuestos
    const montoImpuestos = +(subtotalNeto * tasaImpuesto).toFixed(2);

    // 5. Total Final
    const totalFinal = +(subtotalNeto + montoImpuestos).toFixed(2);

    return {
      total_unidades: totalUnidades,
      subtotal_base: +subtotalBase.toFixed(2),
      porcentaje_descuento_volumen: +(porcentajeVolumen * 100).toFixed(2),
      descuento_volumen: montoDescuentoVolumen,
      regla_volumen: reglaVolumenDetalle,
      subtotal_tras_volumen: subtotalTrasVolumen,
      es_institucional: esInstitucional,
      porcentaje_descuento_institucional: +(porcentajeInstitucional * 100).toFixed(2),
      descuento_institucional: montoDescuentoInstitucional,
      regla_institucional: reglaInstitucionalDetalle,
      descuento_total: totalDescuentos,
      subtotal_neto: subtotalNeto,
      tasa_impuesto_porcentaje: +(tasaImpuesto * 100).toFixed(2),
      total_impuestos: montoImpuestos,
      total_final: totalFinal,
    };
  }
}

Carritos.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
      references: {
        model: Usuario,
        key: "id",
      },
    },
    sesion_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "carritos",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

Usuario.hasOne(Carritos, { foreignKey: "usuario_id", as: "carrito" });
Carritos.belongsTo(Usuario, { foreignKey: "usuario_id", as: "usuario" });
