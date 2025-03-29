const XLSX = require('xlsx');

// 生成模拟数据
const generateMockData = () => {
    // 表头：学号和课程名称
    const headers = ['学号', '语文', '数学', '英语', '物理', '化学', '生物'];
    
    // 学生数据
    const data = [
        headers, // 第一行是表头
        // 以下是学生数据，每行是一个学生的成绩
        [10001, 85, 92, 78, 88, 76, 90],
        [10002, 92, 88, 95, 79, 85, 92],
        [10003, 78, 90, 82, 95, 88, 79],
        [10004, 89, 75, 91, 83, 79, 85],
        [10005, 95, 87, 89, 92, 93, 82],
        [10006, 77, 93, 84, 76, 87, 91],
        [10007, 88, 79, 90, 84, 93, 76],
        [10008, 91, 85, 83, 90, 79, 88],
        [10009, 83, 94, 76, 81, 90, 85],
        [10010, 94, 81, 87, 88, 77, 93]
    ];
    
    return data;
};

// 创建工作簿和工作表
const createExcel = (data) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    const colWidths = [{ wch: 10 }]; // 学号列宽
    for (let i = 1; i < data[0].length; i++) {
        colWidths.push({ wch: 8 }); // 成绩列宽
    }
    ws['!cols'] = colWidths;
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '学生成绩');
    
    // 写入文件
    XLSX.writeFile(wb, '1.xlsx');
    
    console.log('Excel文件已生成: 1.xlsx');
};

// 生成模拟数据并创建Excel文件
const data = generateMockData();
createExcel(data); 