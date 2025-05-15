import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('nfc', 'root', '123456', {
  host: 'localhost',
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: false
});

export default sequelize;