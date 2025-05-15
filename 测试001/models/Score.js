import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Student from './Student.js';
import Teacher from './Teacher.js';

const Score = sequelize.define('Score', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '课程代码'
    },
    courseName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '课程名称'
    },
    score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: '成绩'
    },
    semester: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '学期'
    },
    evaluationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '评分日期'
    },
    comments: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '评语'
    },
    status: {
        type: DataTypes.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft',
        comment: '成绩状态'
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

// 建立与Student和Teacher表的关联
Score.belongsTo(Student, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Score.belongsTo(Teacher, { foreignKey: 'teacherId', onDelete: 'CASCADE' });

// 修改导出方式为默认导出
export default Score;