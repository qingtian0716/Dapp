/**
 * 主文件，导入和初始化所有模块
 */

// 导入所有模块
import { addTimestamp, BigIntSerializer } from './config.js';
import { initWeb3, initializeContract, checkBlockchainConnection, getAccountInfo, getTransactionInfo, getContractBalance, withdraw, payTuition } from './blockchain.js';
import { validateForm, generateResultTable, setValue, getValue, checkDatabaseConnection } from './data.js';
import { excelData, previewExcel, generatePreviewTable, importExcel } from './excel.js';
import { previewImage, uploadImageToPinata } from './ipfs.js';
import { saveStudentInfo, searchStudentById, searchStudentByName, searchStudentsByClass, displayStudentInfo } from './student.js';
import { addSubjectRow, loadScript } from './ui.js';

// 导出所有函数到全局作用域，以便HTML中的onclick事件可以调用
window.addTimestamp = addTimestamp;
window.BigIntSerializer = BigIntSerializer;

window.getAccountInfo = getAccountInfo;
window.getTransactionInfo = getTransactionInfo;
window.getContractBalance = getContractBalance;
window.withdraw = withdraw;
window.payTuition = payTuition;

window.validateForm = validateForm;
window.generateResultTable = generateResultTable;
window.setValue = setValue;
window.getValue = getValue;

window.previewExcel = previewExcel;
window.generatePreviewTable = generatePreviewTable;
window.importExcel = importExcel;

window.previewImage = previewImage;
window.uploadImageToPinata = uploadImageToPinata;

window.saveStudentInfo = saveStudentInfo;
window.searchStudentById = searchStudentById;
window.searchStudentByName = searchStudentByName;
window.searchStudentsByClass = searchStudentsByClass;
window.displayStudentInfo = displayStudentInfo;

window.addSubjectRow = addSubjectRow;
window.loadScript = loadScript;

// 初始化时检测连接状态
document.addEventListener('DOMContentLoaded', async function () {
    // 初始化Web3
    if (await initWeb3()) {
        // 加载合约
        await initializeContract();
        
        // 添加课程按钮事件
        document.getElementById('addSubject').addEventListener('click', addSubjectRow);
    }
    
    // 检查区块链连接
    checkBlockchainConnection();

    // 检查数据库服务器连接
    checkDatabaseConnection();
});