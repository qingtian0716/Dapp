/**
 * Excel文件处理功能
 */

// 存储解析后的Excel数据
let excelData = null;

// 预览Excel数据
async function previewExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择一个Excel文件');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 获取第一个工作表
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // 将工作表转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
                document.getElementById('batchError').innerText = '表格数据不足，至少需要标题行和一行数据';
                return;
            }

            // 处理表格数据
            const headers = jsonData[0];

            if (headers.length < 2) {
                document.getElementById('batchError').innerText = '表格至少需要两列：学号和至少一个课程';
                return;
            }

            // 准备处理后的数据
            const processedData = {
                headers: headers.slice(1), // 第一列是学号，所以从第二列开始为课程名
                students: []
            };

            // 处理每个学生的数据
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];

                if (row.length < 2 || row[0] === undefined || row[0] === '') {
                    continue; // 跳过没有学号的行
                }

                const studentId = String(row[0]).trim();
                const scores = [];

                // 收集每门课程的成绩
                for (let j = 1; j < row.length; j++) {
                    if (j < headers.length) {
                        const score = row[j] !== undefined ? parseInt(row[j]) : null;
                        scores.push(score);
                    }
                }

                // 添加学生数据
                processedData.students.push({
                    studentId: studentId,
                    scores: scores
                });
            }

            if (processedData.students.length === 0) {
                document.getElementById('batchError').innerText = '没有找到有效的学生数据';
                return;
            }

            // 保存处理后的数据
            excelData = processedData;

            // 生成预览表格
            generatePreviewTable(processedData);

            // 启用导入按钮
            document.getElementById('importButton').disabled = false;

            // 清除错误信息
            document.getElementById('batchError').innerText = '';
        } catch (error) {
            console.error('解析Excel文件时出错:', error);
            document.getElementById('batchError').innerText = '解析文件失败: ' + error.message;
        }
    };

    reader.onerror = function () {
        document.getElementById('batchError').innerText = '读取文件失败';
    };

    reader.readAsArrayBuffer(file);
}

// 生成预览表格
function generatePreviewTable(data) {
    const previewContainer = document.getElementById('previewContainer');
    const previewTable = document.getElementById('previewTable');

    // 构建表格HTML
    let tableHTML = '<table>';

    // 表头
    tableHTML += '<thead><tr><th>学号</th>';
    for (const header of data.headers) {
        tableHTML += `<th>${header}</th>`;
    }
    tableHTML += '</tr></thead>';

    // 表体
    tableHTML += '<tbody>';
    for (const student of data.students) {
        tableHTML += `<tr><td>${student.studentId}</td>`;

        for (let i = 0; i < data.headers.length; i++) {
            const score = i < student.scores.length ? student.scores[i] : '';
            const scoreClass = score !== null && !isNaN(score) && score >= 0 && score <= 100 ? 'valid-data' : 'invalid-data';
            tableHTML += `<td class="${scoreClass}">${score !== null ? score : ''}</td>`;
        }

        tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';

    // 更新预览
    previewTable.innerHTML = tableHTML;
    previewContainer.style.display = 'block';
}

// 批量导入数据
async function importExcel() {
    if (!excelData || !excelData.students || excelData.students.length === 0) {
        document.getElementById('batchError').innerText = '没有有效的数据可导入';
        return;
    }

    try {
        // 准备批量导入的数据结构
        const studentIds = [];
        const subjectNamesArray = [];
        const scoresArray = [];

        // 准备数据库API请求的数据结构
        const dbStudents = [];

        // 遍历每个学生
        for (const student of excelData.students) {
            const studentId = parseInt(student.studentId);

            if (isNaN(studentId)) {
                continue; // 跳过无效学号
            }

            const studentSubjects = [];
            const studentScores = [];

            // 遍历每门课程
            for (let i = 0; i < excelData.headers.length; i++) {
                const score = i < student.scores.length ? student.scores[i] : null;

                // 只添加有效成绩的课程
                if (score !== null && !isNaN(score) && score >= 0 && score <= 100) {
                    studentSubjects.push(excelData.headers[i]);
                    studentScores.push(score);
                }
            }

            // 只有有课程数据的学生才添加
            if (studentSubjects.length > 0) {
                studentIds.push(studentId);
                subjectNamesArray.push(studentSubjects);
                scoresArray.push(studentScores);

                // 为数据库API添加记录
                dbStudents.push({
                    studentId: studentId,
                    subjectNames: studentSubjects,
                    scores: studentScores
                });
            }
        }

        if (studentIds.length === 0) {
            document.getElementById('batchError').innerText = '没有有效的学生成绩数据可导入';
            return;
        }

        // 获取用户账户
        const accounts = await web3.eth.getAccounts();

        // 获取当前gas价格
        const gasPrice = await web3.eth.getGasPrice();

        // 调用合约的setBatch方法
        const tx = await contract.methods.setBatch(studentIds, subjectNamesArray, scoresArray).send({
            from: accounts[0],
            gasPrice: gasPrice
        });

        // 显示交易哈希
        document.getElementById('batchTransactionInfo').innerText = "交易哈希: " + tx.transactionHash;

        // 调用后端API将数据保存到MySQL数据库
        try {
            const apiResponse = await fetch('http://localhost:8080/api/students/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ students: dbStudents })
            });

            const apiResult = await apiResponse.json();

            if (apiResult.success) {
                console.log('成功保存数据到MySQL:', apiResult);
            } else {
                console.error('保存数据到MySQL失败:', apiResult);
                document.getElementById('batchError').innerText = '区块链导入成功，但数据库保存失败: ' + apiResult.message;
            }
        } catch (apiError) {
            console.error('调用数据库API失败:', apiError);
            document.getElementById('batchError').innerText = '区块链导入成功，但数据库API调用失败: ' + apiError.message;
        }

        // 清除错误信息
        document.getElementById('batchError').innerText = '';

        // 显示成功消息
        alert(`成功导入 ${studentIds.length} 名学生的成绩数据到区块链和数据库`);
    } catch (error) {
        console.error('批量导入失败:', error);
        document.getElementById('batchError').innerText = '批量导入失败: ' + error.message;
    }
}

export {
    excelData,
    previewExcel,
    generatePreviewTable,
    importExcel
};