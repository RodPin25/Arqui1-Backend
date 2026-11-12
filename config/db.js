import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        logging: false, // Puedes poner console.log para ver las queries que genera
        define: {
            underscored: true, // Convierte camelCase a snake_case automáticamente
            paranoid: true,    // Habilita soft delete usando 'deleted_at'
        }
    }
);


