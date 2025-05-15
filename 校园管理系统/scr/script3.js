// 存储解析后的学生信息Excel数据
let studentInfoExcelData = null;

// 预览学生信息Excel数据
async function previewStudentInfoExcel() {
    const fileInput = document.getElementById('studentInfoExcelFile');
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
                document.getElementById('studentInfoBatchError').innerText = '表格数据不足，至少需要标题行和一行数据';
                return;
            }

            // 处理表格数据
            const headers = jsonData[0];

            if (headers.length < 4) {
                document.getElementById('studentInfoBatchError').innerText = '表格至少需要四列：学号、姓名、性别、班级';
                return;
            }

            // 准备处理后的数据
            const processedData = [];

            // 处理每个学生的数据
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];

                if (row.length < 4 || row[0] === undefined || row[0] === '') {
                    continue; // 跳过没有学号的行
                }

                const studentId = String(row[0]).trim();
                const name = String(row[1] || '').trim();
                const gender = String(row[2] || '').trim();
                const className = String(row[3] || '').trim();

                // 添加学生数据
                processedData.push({
                    studentId: studentId,
                    name: name,
                    gender: gender,
                    className: className
                });
            }

            if (processedData.length === 0) {
                document.getElementById('studentInfoBatchError').innerText = '没有找到有效的学生数据';
                return;
            }

            // 保存处理后的数据
            window.studentInfoData = processedData;

            // 生成预览表格
            generateStudentInfoPreviewTable(processedData);

            // 启用导入按钮
            document.getElementById('importStudentInfoButton').disabled = false;

            // 清除错误信息
            document.getElementById('studentInfoBatchError').innerText = '';
        } catch (error) {
            console.error('解析Excel文件时出错:', error);
            document.getElementById('studentInfoBatchError').innerText = '解析文件失败: ' + error.message;
        }
    };

    reader.onerror = function () {
        document.getElementById('studentInfoBatchError').innerText = '读取文件失败';
    };

    reader.readAsArrayBuffer(file);
}

// 生成学生信息预览表格
function generateStudentInfoPreviewTable(data) {
    const previewContainer = document.getElementById('studentInfoPreviewContainer');
    const previewTable = document.getElementById('studentInfoPreviewTable');
    
    // 清空现有表格
    previewTable.innerHTML = '';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['学号', '姓名', '性别', '班级'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    previewTable.appendChild(thead);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    
    data.forEach(student => {
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        idCell.textContent = student.studentId;
        row.appendChild(idCell);
        
        const nameCell = document.createElement('td');
        nameCell.textContent = student.name;
        row.appendChild(nameCell);
        
        const genderCell = document.createElement('td');
        genderCell.textContent = student.gender;
        row.appendChild(genderCell);
        
        const classCell = document.createElement('td');
        classCell.textContent = student.className;
        row.appendChild(classCell);
        
        tbody.appendChild(row);
    });
    
    previewTable.appendChild(tbody);
    
    // 显示预览容器
    previewContainer.style.display = 'block';
}

// 导入学生信息Excel数据
async function importStudentInfoExcelData() {
    if (!window.studentInfoData || window.studentInfoData.length === 0) {
        document.getElementById('studentInfoBatchError').innerText = '没有可导入的数据';
        return;
    }
    
    try {
        document.getElementById('studentInfoBatchError').innerHTML = `
            <div class="status-message info">
                ⏳ 正在处理数据，共 ${window.studentInfoData.length} 名学生...
            </div>
        `;
        
        // 获取账户和gas价格
        const accounts = await web3.eth.getAccounts();
        const gasPrice = await web3.eth.getGasPrice();
        
        // 准备批量导入的数据
        const studentIds = [];
        const names = [];
        const genders = [];
        const classNames = [];
        
        // 处理每个学生的数据
        for (const student of window.studentInfoData) {
            studentIds.push(parseInt(student.studentId));
            names.push(student.name);
            genders.push(student.gender);
            classNames.push(student.className);
        }
        
        let blockchainSuccess = false;
        let databaseSuccess = false;
        let transactionHash = '';
        
        // 尝试保存到区块链
        try {
            const tx = await contract.methods.setStudentInfoBatch(
                studentIds,
                names,
                genders,
                classNames
            ).send({
                from: accounts[0],
                gasPrice: gasPrice,
                gas: 5000000  // 设置足够的gas限制
            });
            
            transactionHash = tx.transactionHash;
            blockchainSuccess = true;
            
            document.getElementById('studentInfoBatchError').innerHTML = `
                <div class="status-message success">
                    ✅ 区块链保存成功！交易哈希: ${transactionHash}
                </div>
            `;
        } catch (blockchainError) {
            console.error('区块链批量保存失败:', blockchainError);
            document.getElementById('studentInfoBatchError').innerHTML = `
                <div class="status-message error">
                    ❌ 区块链批量保存失败: ${blockchainError.message}
                </div>
            `;
        }
        
        // 尝试保存到数据库
        try {
            const response = await fetch('http://localhost:8080/api/student-info/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    students: window.studentInfoData.map(student => ({
                        studentId: parseInt(student.studentId),
                        name: student.name,
                        gender: student.gender,
                        className: student.className
                    }))
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                databaseSuccess = true;
                document.getElementById('studentInfoBatchError').innerHTML += `
                    <div class="status-message success">
                        ✅ 数据库保存成功！成功: ${result.stats?.success || window.studentInfoData.length}, 失败: ${result.stats?.error || 0}
                    </div>
                `;
            } else {
                throw new Error(result.message || '数据库保存失败');
            }
        } catch (dbError) {
            console.error('数据库批量保存失败:', dbError);
            document.getElementById('studentInfoBatchError').innerHTML += `
                <div class="status-message error">
                    ❌ 数据库批量保存失败: ${dbError.message || '服务器错误'}
                </div>
            `;
        }
        
        // 如果至少有一个操作成功，显示成功信息
        if (blockchainSuccess || databaseSuccess) {
            let successMessage = `
                <div class="status-message success">
                    ✅ 批量学生信息导入完成！共处理 ${studentIds.length} 名学生的信息。
                    <br>
            `;
            
            if (blockchainSuccess) {
                successMessage += `区块链交易成功，交易哈希: ${transactionHash}<br>`;
            } else {
                successMessage += `区块链交易失败，但这不影响学生信息录入。<br>`;
            }
            
            if (databaseSuccess) {
                successMessage += `数据库保存成功。`;
            } else {
                successMessage += `数据库保存失败，但信息已记录在区块链上。`;
            }
            
            successMessage += `</div>`;
            
            document.getElementById('studentInfoBatchError').innerHTML += successMessage;
        } else {
            document.getElementById('studentInfoBatchError').innerHTML += `
                <div class="status-message error">
                    ❌ 学生信息录入失败：区块链交易和数据库保存均失败。
                    <br>请检查网络连接和合约权限。
                </div>
            `;
        }
        
        // 禁用导入按钮，防止重复导入
        document.getElementById('importStudentInfoButton').disabled = true;
        
    } catch (error) {
        console.error('批量导入学生信息失败:', error);
        document.getElementById('studentInfoBatchError').innerHTML = `
            <div class="status-message error">
                ❌ 批量导入失败: ${error.message}
            </div>
        `;
    }
}



// 存储解析后的批量交学费Excel数据
let batchTuitionExcelData = null;

// 预览批量交学费Excel数据
async function previewBatchTuition() {
    const fileInput = document.getElementById('batchTuitionExcelFile');
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
                document.getElementById('batchTuitionError').innerText = '表格数据不足，至少需要标题行和一行数据';
                return;
            }

            // 处理表格数据
            const headers = jsonData[0];

            if (headers.length < 1) {
                document.getElementById('batchTuitionError').innerText = '表格至少需要一列：学号';
                return;
            }

            // 准备处理后的数据
            const processedData = {
                headers: headers,
                students: []
            };

            // 处理每个学生的数据
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];

                if (row.length < 1 || row[0] === undefined || row[0] === '') {
                    continue; // 跳过没有学号的行
                }

                const studentId = String(row[0]).trim();

                // 添加学生数据
                processedData.students.push({
                    studentId: parseInt(studentId)
                });
            }

            if (processedData.students.length === 0) {
                document.getElementById('batchTuitionError').innerText = '没有找到有效的学生数据';
                return;
            }

            // 保存处理后的数据
            batchTuitionExcelData = processedData;

            // 生成预览表格
            generateBatchTuitionPreviewTable(processedData);

            // 启用导入按钮
            document.getElementById('importBatchTuitionButton').disabled = false;

            // 清除错误信息
            document.getElementById('batchTuitionError').innerText = '';
        } catch (error) {
            console.error('解析Excel文件时出错:', error);
            document.getElementById('batchTuitionError').innerText = '解析文件失败: ' + error.message;
        }
    };

    reader.onerror = function () {
        document.getElementById('batchTuitionError').innerText = '读取文件失败';
    };

    reader.readAsArrayBuffer(file);
}

// 生成批量交学费预览表格
function generateBatchTuitionPreviewTable(data) {
    const previewContainer = document.getElementById('batchTuitionPreviewContainer');
    const previewTable = document.getElementById('batchTuitionPreviewTable');

    // 构建表格HTML
    let tableHTML = '<table>';

    // 表头
    tableHTML += '<thead><tr><th>学号</th></tr></thead>';

    // 表体
    tableHTML += '<tbody>';
    for (const student of data.students) {
        tableHTML += `<tr><td>${student.studentId}</td></tr>`;
    }
    tableHTML += '</tbody></table>';

    // 更新预览
    previewTable.innerHTML = tableHTML;
    previewContainer.style.display = 'block';
}


// 查看学生学费状态
async function checkStudentTuition(studentId) {
    try {
        // 调用合约的get方法获取学生信息
        const result = await contract.methods.get(parseInt(studentId)).call();
        
        if (!result) {
            alert(`无法获取学号为 ${studentId} 的学生学费状态`);
            return;
        }
        
        // 解析返回值
        let hasPaidTuition;
        if (Array.isArray(result) && result.length >= 4) {
            hasPaidTuition = result[3]; // 第四个返回值是hasPaidTuition
        } else if (typeof result === 'object') {
            hasPaidTuition = result.hasPaidTuition || result[3];
        } else {
            throw new Error('无法识别的返回值类型');
        }
        
        // 更新学费状态显示
        const tuitionStatusElement = document.getElementById('tuitionQueryStatus');
        if (hasPaidTuition) {
            tuitionStatusElement.innerText = '✅ 该学生已缴纳学费';
            tuitionStatusElement.className = 'status-message paid';
        } else {
            tuitionStatusElement.innerText = '❌ 该学生尚未缴纳学费';
            tuitionStatusElement.className = 'status-message unpaid';
        }
        
        // 清除错误信息
        document.getElementById('tuitionQueryError').innerText = '';
        
        return hasPaidTuition;
    } catch (error) {
        console.error('查询学费状态失败:', error);
        document.getElementById('tuitionQueryError').innerText = '查询学费状态失败: ' + error.message;
        document.getElementById('tuitionQueryStatus').innerText = '';
        return null;
    }
}

// 添加课程行
function addSubjectRow() {
    const container = document.getElementById('subjects-container');
    const newRow = document.createElement('div');
    newRow.className = 'subject-row';

    const subjectSelect = document.createElement('select');
    subjectSelect.className = 'subject-name';
    subjectSelect.innerHTML = `
        <option value="">请选择课程</option>
        <option value="语文">语文</option>
        <option value="数学">数学</option>
        <option value="英语">英语</option>
        <option value="物理">物理</option>
        <option value="化学">化学</option>
        <option value="生物">生物</option>
        <option value="历史">历史</option>
        <option value="地理">地理</option>
        <option value="政治">政治</option>
        <option value="计算机">计算机</option>
        <option value="体育">体育</option>
        <option value="音乐">音乐</option>
        <option value="美术">美术</option>
    `;

    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.className = 'subject-score';
    scoreInput.placeholder = '成绩';
    scoreInput.min = '0';
    scoreInput.max = '100';

    const removeButton = document.createElement('button');
    removeButton.innerText = '删除';
    removeButton.onclick = function () {
        container.removeChild(newRow);
    };

    newRow.appendChild(subjectSelect);
    newRow.appendChild(scoreInput);
    newRow.appendChild(removeButton);
    container.appendChild(newRow);
}

// 验证表单
function validateForm() {
    const studentId = document.getElementById('studentId').value;
    if (!studentId) {
        document.getElementById('setError').innerText = '请输入学号';
        return false;
    }

    const subjectNames = Array.from(document.getElementsByClassName('subject-name')).map(input => input.value);
    const scores = Array.from(document.getElementsByClassName('subject-score')).map(input => input.value);

    // 验证每个科目都有名称和成绩
    for (let i = 0; i < subjectNames.length; i++) {
        if (!subjectNames[i]) {
            document.getElementById('setError').innerText = `第${i + 1}个课程名称不能为空`;
            return false;
        }
        if (!scores[i]) {
            document.getElementById('setError').innerText = `第${i + 1}个课程成绩不能为空`;
            return false;
        }
        if (parseInt(scores[i]) < 0 || parseInt(scores[i]) > 100) {
            document.getElementById('setError').innerText = `第${i + 1}个课程成绩必须在0-100之间`;
            return false;
        }
    }

    document.getElementById('setError').innerText = '';
    return true;
}