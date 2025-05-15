// 导入依赖
import fs from'fs';
import path from 'path';
import Role from '../models/Role.js';
import Admin from '../models/Admin.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import {Score} from '../models/Score.js';
import User from '../models/User.js';
import sequelize from '../config/database.js';

// 初始化数据库函数
async function initDatabase() {
    let transaction;
    try {
        // 开启数据库事务
        transaction = await sequelize.transaction();

        // 步骤 1: 同步数据库结构 - 按照依赖关系删除表
        console.log('开始删除现有表结构...');
        const modelsToDrop = [Score, User, Student, Teacher, Admin, Role];
        for (const model of modelsToDrop) {
            await model.drop({ transaction });
            console.log(`已删除表: ${model.tableName}`);
        }

        // 步骤 2: 按照依赖关系重新创建表
        console.log('\n开始创建新表结构...');
        const modelsToCreate = [Role, Admin, Teacher, Student, Score, User];
        for (const model of modelsToCreate) {
            await model.sync({ force: true, transaction });
            console.log(`已创建表: ${model.tableName}`);
        }

        // 步骤 3: 创建基础角色
        console.log('\n开始创建基础角色...');
        const baseRoles = [
            { 
                name: 'admin', 
                description: '系统管理员', 
                permissions: { all: true } 
            },
            { 
                name: 'teacher', 
                description: '教师', 
                permissions: { 
                    manageScores: true, 
                    viewStudents: true 
                } 
            },
            { 
                name: 'student', 
                description: '学生', 
                permissions: { 
                    viewScores: true 
                } 
            }
        ];

        const createdRoles = await Promise.all(
            baseRoles.map(async role => {
                const createdRole = await Role.create(role, { transaction });
                console.log(`已创建角色: ${role.name}`);
                return createdRole;
            })
        );

        // 步骤 4: 读取合约地址配置文件
        console.log('\n读取管理员合约地址...');
        const addressFilePath = path.join(__dirname, '..', 'address', 'YourCollectible_address.json');
        
        if (!fs.existsSync(addressFilePath)) {
            throw new Error('合约地址配置文件不存在');
        }

        const addressData = JSON.parse(fs.readFileSync(addressFilePath, 'utf8'));
        const adminAddress = addressData.admin;

        if (!adminAddress) {
            throw new Error('管理员地址未配置');
        }

        // 步骤 5: 创建管理员记录
        console.log('创建管理员账户...');
        const adminRole = createdRoles.find(role => role.name === 'admin');
        if (!adminRole) {
            throw new Error('未找到管理员角色');
        }

        const adminRecord = {
            username: `user_${adminAddress.slice(2, 8)}`,
            walletAddress: adminAddress,
            name: '系统管理员',
            status: 'active',
            roleId: adminRole.id
        };

        const createdAdmin = await Admin.create(adminRecord, { transaction });
        console.log(`已创建管理员账户: ${createdAdmin.username}`);

        // 步骤 6: 提交事务
        await transaction.commit();
        console.log('\n数据库初始化完成！');

        // 返回管理员信息
        return {
            success: true,
            admin: adminRecord
        };

    } catch (error) {
        // 若发生错误，回滚事务
        if (transaction) {
            await transaction.rollback();
        }
        console.error('数据库初始化失败：', error.message);
        throw error;
    }
}

// 导出函数
export{ initDatabase };

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
    initDatabase()
        .then(result => {
            console.log('初始化成功：', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('初始化失败：', error);
            process.exit(1);
        });
}