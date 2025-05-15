import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Role from './Role.js';

const Student = sequelize.define('Student', {
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
    studentId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: '学号'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    class: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '班级'
    },
    major: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '专业'
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
Student.belongsTo(Role, { foreignKey: 'roleId', onDelete: 'CASCADE' });

export default Student;