// 生成班级成绩图表
function generateClassCharts(classData) {
    // 准备图表容器
    const chartsContainer = document.getElementById('chartsContainer');
    chartsContainer.innerHTML = '<h3>班级成绩分析</h3>';
    
    // 创建科目平均分图表
    const avgChartDiv = document.createElement('div');
    avgChartDiv.id = 'subjectAvgChart';
    avgChartDiv.className = 'chart-container';
    avgChartDiv.style.width = '100%';
    avgChartDiv.style.height = '400px';
    chartsContainer.appendChild(avgChartDiv);
    
    // 创建学生总分排名图表
    const rankChartDiv = document.createElement('div');
    rankChartDiv.id = 'studentRankChart';
    rankChartDiv.className = 'chart-container';
    rankChartDiv.style.width = '100%';
    rankChartDiv.style.height = '400px';
    chartsContainer.appendChild(rankChartDiv);
    
    // 创建成绩分布图表
    const distributionChartDiv = document.createElement('div');
    distributionChartDiv.id = 'gradeDistributionChart';
    distributionChartDiv.className = 'chart-container';
    distributionChartDiv.style.width = '100%';
    distributionChartDiv.style.height = '400px';
    chartsContainer.appendChild(distributionChartDiv);
    
    // 计算各科目平均分
    const subjects = Array.from(classData.subjects);
    const subjectAvgs = {};
    
    subjects.forEach(subject => {
        let total = 0;
        let count = 0;
        
        classData.gradesData.forEach(student => {
            if (student.grades[subject] !== undefined) {
                total += student.grades[subject];
                count++;
            }
        });
        
        subjectAvgs[subject] = count > 0 ? Math.round(total / count * 10) / 10 : 0;
    });
    
    // 计算学生总分和平均分
    const studentTotals = classData.gradesData.map(student => {
        let total = 0;
        let count = 0;
        
        subjects.forEach(subject => {
            if (student.grades[subject] !== undefined) {
                total += student.grades[subject];
                count++;
            }
        });
        
        return {
            name: student.name,
            total: total,
            average: count > 0 ? Math.round(total / count * 10) / 10 : 0
        };
    });
    
    // 按总分排序
    studentTotals.sort((a, b) => b.total - a.total);
    
    // 生成科目平均分图表
    const avgChart = echarts.init(document.getElementById('subjectAvgChart'));
    avgChart.setOption({
        title: {
            text: '各科目平均分',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: subjects,
            axisLabel: {
                interval: 0,
                rotate: 30
            }
        },
        yAxis: {
            type: 'value',
            name: '分数',
            min: 0,
            max: 100
        },
        series: [{
            name: '平均分',
            type: 'bar',
            data: subjects.map(subject => subjectAvgs[subject]),
            itemStyle: {
                color: '#1a73e8'
            },
            label: {
                show: true,
                position: 'top'
            }
        }]
    });
    
    // 生成学生总分排名图表
    const rankChart = echarts.init(document.getElementById('studentRankChart'));
    rankChart.setOption({
        title: {
            text: '学生总分排名',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                const data = params[0];
                return `${data.name}<br/>总分: ${data.value}<br/>平均分: ${studentTotals[data.dataIndex].average}`;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: '分数'
        },
        yAxis: {
            type: 'category',
            data: studentTotals.map(item => item.name),
            inverse: true
        },
        series: [{
            name: '总分',
            type: 'bar',
            data: studentTotals.map(item => item.total),
            itemStyle: {
                color: function(params) {
                    // 根据排名设置不同颜色
                    const colors = ['#ff9800', '#4caf50', '#2196f3', '#9c27b0', '#607d8b'];
                    return colors[params.dataIndex % colors.length];
                }
            },
            label: {
                show: true,
                position: 'right'
            }
        }]
    });
    
    // 计算成绩分布
    const scoreRanges = ['90-100', '80-89', '70-79', '60-69', '0-59'];
    const distributionData = {};
    
    subjects.forEach(subject => {
        distributionData[subject] = [0, 0, 0, 0, 0]; // 对应五个分数段
    });
    
    classData.gradesData.forEach(student => {
        subjects.forEach(subject => {
            const score = student.grades[subject];
            if (score !== undefined) {
                if (score >= 90) distributionData[subject][0]++;
                else if (score >= 80) distributionData[subject][1]++;
                else if (score >= 70) distributionData[subject][2]++;
                else if (score >= 60) distributionData[subject][3]++;
                else distributionData[subject][4]++;
            }
        });
    });
    
    // 生成成绩分布图表
    const distributionChart = echarts.init(document.getElementById('gradeDistributionChart'));
    distributionChart.setOption({
        title: {
            text: '成绩分布',
            left: 'center'
        },
        tooltip: {
            trigger: 'item'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: subjects
        },
        series: [
            {
                name: '成绩分布',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '18',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: scoreRanges.map((range, index) => {
                    let total = 0;
                    subjects.forEach(subject => {
                        total += distributionData[subject][index];
                    });
                    return {
                        name: range,
                        value: total
                    };
                })
            }
        ]
    });
}

// 获取单个学生成绩并显示图表
async function getStudentGradesForChart(studentId) {
    try {
        // 调用合约的get方法获取学生信息
        const result = await contract.methods.get(parseInt(studentId)).call();
        
        if (!result || !result[0]) {
            alert(`学号为 ${studentId} 的学生暂无成绩记录`);
            return;
        }
        
        // 解析返回值
        const subjectNames = result[1];
        const scores = result[2];
        
        if (!Array.isArray(subjectNames) || !Array.isArray(scores) || subjectNames.length === 0) {
            alert(`学号为 ${studentId} 的学生暂无成绩记录`);
            return;
        }
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>学号 ${studentId} 的成绩图表</h3>
                <div id="studentChartContainer" style="width: 100%; height: 400px;"></div>
                ${generateResultTable(studentId, subjectNames, scores)}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭按钮事件
        modal.querySelector('.close-button').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // 生成学生成绩图表
        setTimeout(() => {
            const chart = echarts.init(document.getElementById('studentChartContainer'));
            chart.setOption({
                title: {
                    text: '学生成绩分析',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: subjectNames,
                    axisLabel: {
                        interval: 0,
                        rotate: 30
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '分数',
                    min: 0,
                    max: 100
                },
                series: [{
                    name: '分数',
                    type: 'bar',
                    data: scores.map(score => parseInt(score)),
                    itemStyle: {
                        color: function(params) {
                            // 根据分数设置不同颜色
                            const score = params.value;
                            if (score >= 90) return '#4caf50';
                            if (score >= 80) return '#2196f3';
                            if (score >= 70) return '#ff9800';
                            if (score >= 60) return '#ff5722';
                            return '#f44336';
                        }
                    },
                    label: {
                        show: true,
                        position: 'top'
                    }
                }]
            });
        }, 100);
        
    } catch (error) {
        console.error('获取学生成绩失败:', error);
        alert('获取学生成绩失败: ' + error.message);
    }
}

// 修改学费状态查询函数
async function checkTuitionStatus() {
    // 修改这里使用正确的元素ID
    const studentId = document.getElementById('tuitionQueryStudentId').value;
    if (!studentId) {
        document.getElementById('tuitionQueryError').innerText = '请输入学号';
        document.getElementById('tuitionQueryStatus').innerText = '';
        
        // 检查按钮是否存在
        const payButton = document.getElementById('payTuitionButton');
        if (payButton) {
            payButton.style.display = 'none';
        }
        return;
    }

    try {
        // 先清除之前的状态
        document.getElementById('tuitionQueryError').innerText = '';
        document.getElementById('tuitionQueryStatus').innerText = '正在查询...';
        
        // 检查按钮和交易信息元素是否存在
        const payButton = document.getElementById('payTuitionButton');
        const transactionInfo = document.getElementById('tuitionTransactionInfo');
        
        if (payButton) {
            payButton.style.display = 'none';
        }
        
        if (transactionInfo) {
            transactionInfo.innerText = '';
        }
        
        // 使用共通的查询函数
        const hasPaidTuition = await checkStudentTuition(studentId);
        
        // 额外确保按钮状态正确
        if (hasPaidTuition === false && payButton) { // 明确是false而不是null或undefined，且按钮存在
            payButton.style.display = 'inline-block';
            payButton.classList.add('show'); // 添加强制显示的类
            
            // 确保按钮在DOM中可见
            setTimeout(() => {
                if (payButton && payButton.style.display !== 'inline-block') {
                    payButton.style.display = 'inline-block';
                    console.log('强制显示缴费按钮');
                }
            }, 100);
        }
    } catch (error) {
        console.error('查询学费状态失败:', error);
        document.getElementById('tuitionQueryError').innerText = '查询失败: ' + error.message;
        document.getElementById('tuitionQueryStatus').innerText = '';
        
        // 检查按钮是否存在
        const payButton = document.getElementById('payTuitionButton');
        if (payButton) {
            payButton.style.display = 'none';
        }
    }
}

// 缴纳学费函数
async function payTuition() {
    // 修改这里使用正确的元素ID
    const studentId = document.getElementById('payTuitionStudentId').value;
    if (!studentId) {
        document.getElementById('payTuitionError').innerText = '请输入学号';
        return;
    }

    try {
        // 先检查学费状态
        const hasPaidTuition = await checkStudentTuition(studentId);
        
        // 如果已经缴费，显示提示并返回
        if (hasPaidTuition === true) {
            return; // 状态已在checkStudentForPayment中更新，这里不需要重复操作
        }

        // 获取账户和学费金额
        const accounts = await web3.eth.getAccounts();
        const tuitionFee = await contract.methods.tuitionFee().call();
        
        // 执行交易
        document.getElementById('payTuitionStatus').innerText = '正在处理交易，请稍候...';
        const tx = await contract.methods.payTuition(studentId).send({
            from: accounts[0],
            value: tuitionFee
        });

        // 更新状态
        document.getElementById('payTuitionTransactionInfo').innerText = 
            "交易成功！交易哈希: " + tx.transactionHash;
        document.getElementById('payTuitionError').innerText = '';
        document.getElementById('payTuitionStatus').innerText = '✅ 学费缴纳成功！';
        document.getElementById('payTuitionStatus').className = 'status-message paid';
    } catch (error) {
        document.getElementById('payTuitionError').innerText = 
            "交易失败: " + error.message;
        document.getElementById('payTuitionTransactionInfo').innerText = '';
    }
}

// 提取合约余额函数
async function withdrawFunds() {
    try {
        // 清除之前的状态
        document.getElementById('withdrawError').innerText = '';
        document.getElementById('withdrawStatus').innerText = '处理中...';
        document.getElementById('withdrawTransactionInfo').innerText = '';
        
        // 获取当前账户
        const accounts = await web3.eth.getAccounts();
        
        // 调用合约的withdraw方法
        const tx = await contract.methods.withdraw().send({
            from: accounts[0]
        });
        
        // 更新状态
        document.getElementById('withdrawStatus').innerText = '✅ 提取成功!';
        document.getElementById('withdrawTransactionInfo').innerText = 
            "交易成功！交易哈希: " + tx.transactionHash;
        
        // 刷新合约余额
        getContractBalance();
    } catch (error) {
        console.error('提取资金失败:', error);
        document.getElementById('withdrawError').innerText = '提取失败: ' + error.message;
        document.getElementById('withdrawStatus').innerText = '';
    }
}

// 获取合约余额函数
async function getContractBalance() {
    try {
        // 显示加载状态
        document.getElementById('contractBalance').innerText = '合约余额: 加载中...';
        
        // 获取合约地址的余额
        const balance = await web3.eth.getBalance(contract._address);
        const balanceInEther = web3.utils.fromWei(balance, 'ether');
        
        // 更新显示
        document.getElementById('contractBalance').innerText = `合约余额: ${balanceInEther} ETH`;
    } catch (error) {
        console.error('获取合约余额失败:', error);
        document.getElementById('contractBalance').innerText = '获取余额失败: ' + error.message;
    }
}

// Set Value Function
async function setValue() {
    if (!validateForm()) {
        return;
    }

    const studentId = document.getElementById('studentId').value;
    const newSubjectNames = Array.from(document.getElementsByClassName('subject-name')).map(input => input.value);
    const newScores = Array.from(document.getElementsByClassName('subject-score')).map(input => parseInt(input.value));

    const accounts = await web3.eth.getAccounts();

    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();

    try {
        // 先尝试获取学生现有成绩
        let existingSubjectNames = [];
        let existingScores = [];
        let hasPaidTuition = false;
        
        try {
            const result = await contract.methods.get(studentId).call();
            
            // 解析返回值
            if (Array.isArray(result) && result.length >= 3) {
                const exists = result[0];
                if (exists) {
                    existingSubjectNames = result[1];
                    existingScores = result[2];
                    if (result.length >= 4) {
                        hasPaidTuition = result[3];
                    }
                }
            } else if (typeof result === 'object') {
                const exists = result.exists || result[0];
                if (exists) {
                    existingSubjectNames = result.subjectNames || result[1];
                    existingScores = result.scores || result[2];
                    if ('hasPaidTuition' in result || result.length >= 4) {
                        hasPaidTuition = result.hasPaidTuition || result[3];
                    }
                }
            }
        } catch (error) {
            console.log("获取现有成绩失败，可能是新学生:", error);
            // 如果获取失败，就假设没有现有成绩，继续执行
        }
        
        // 合并现有成绩和新成绩
        const mergedSubjectNames = [...existingSubjectNames];
        const mergedScores = [...existingScores];
        
        // 遍历新科目和成绩
        for (let i = 0; i < newSubjectNames.length; i++) {
            const subjectName = newSubjectNames[i];
            const score = newScores[i];
            
            // 查找是否已存在该科目
            const existingIndex = mergedSubjectNames.findIndex(name => name === subjectName);
            
            if (existingIndex !== -1) {
                // 如果科目已存在，更新成绩
                mergedScores[existingIndex] = score;
            } else {
                // 如果科目不存在，添加新科目和成绩
                mergedSubjectNames.push(subjectName);
                mergedScores.push(score);
            }
        }

        // 调用智能合约，使用合并后的数据
        try {
            const tx = await contract.methods.set(studentId, mergedSubjectNames, mergedScores).send({
                from: accounts[0],
                gasPrice: gasPrice,
                gas: 3000000  // 增加gas限制，避免gas不足导致的交易失败
            });

            document.getElementById('transactionInfo').innerText = "交易哈希: " + tx.transactionHash;

            // 保存到数据库
            try {
                // 使用 BigIntSerializer 处理可能的 BigInt 值
                const requestData = {
                    studentId: parseInt(studentId),
                    subjectNames: mergedSubjectNames,
                    scores: mergedScores.map(score => typeof score === 'bigint' ? score.toString() : score)
                };
                
                console.log('发送到数据库的数据:', requestData);
                
                const response = await fetch('http://localhost:8080/api/students/single', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message);
                }
                
                // 添加成功提示
                document.getElementById('setError').innerHTML = `
                    <div class="status-message success">
                        ✅ 成绩录入成功！${existingSubjectNames.length > 0 ? '已更新现有科目成绩。' : ''}
                      
                    </div>
                `;
            } catch (dbError) {
                console.error('保存到数据库失败:', dbError);
                document.getElementById('setError').innerText = "数据库保存失败: " + dbError.message;
            }
        } catch (txError) {
            console.error('交易执行失败:', txError);
            
            // 检查是否是因为学费未缴纳导致的错误
            if (txError.message.includes('revert') || txError.message.includes('reverted')) {
                // 尝试调用合约的view方法检查学费状态
                try {
                    const tuitionStatus = await contract.methods.hasPaidTuition(studentId).call();
                    if (!tuitionStatus) {
                        document.getElementById('setError').innerHTML = `
                            <div class="status-message error">
                                ❌ 交易失败: 该学生尚未缴纳学费，无法录入成绩。
                                <br>请先前往学费管理页面为该学生缴纳学费。
                            </div>
                        `;
                        return;
                    }
                } catch (checkError) {
                    // 如果无法检查学费状态，则显示一般错误
                    document.getElementById('setError').innerHTML = `
                        <div class="status-message error">
                            ❌ 交易失败: ${txError.message}
                            <br>可能原因: 学生未缴纳学费、合约权限不足或网络问题。
                        </div>
                    `;
                    return;
                }
            }
            
            // 显示一般错误信息
            document.getElementById('setError').innerHTML = `
                <div class="status-message error">
                    ❌ 交易失败: ${txError.message}
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('setError').innerText = "操作失败: " + error.message;
        console.error(error);
    }
}

// 添加BigInt序列化支持
const BigIntSerializer = {
    stringify: (obj) => {
        return JSON.stringify(obj, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value
        );
    }
};
