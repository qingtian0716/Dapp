import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Role from './Role.js';

const Teacher = sequelize.define('Teacher', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    walletAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '职称'
    },
    department: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '所属院系'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

// 建立与Role表的关联，添加onDelete: 'CASCADE'选项
Teacher.belongsTo(Role, { foreignKey: 'roleId', onDelete: 'CASCADE' });

export default Teacher;