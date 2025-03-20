// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract YourCollectible {
    // 定义学生成绩结构体
    struct Grade {
        string subject;
        uint256 score;
    }
    
    // 学生姓名到成绩数组的映射
    mapping(string => Grade[]) private studentGrades;
    
    // 记录所有已添加的学生
    string[] private students;
    
    // 检查学生是否已存在
    mapping(string => bool) private studentExists;
    
    // 添加或更新学生成绩
    function addGrade(string memory studentName, string memory subject, uint256 score) public {
        // 如果学生不存在，添加到学生列表
        if (!studentExists[studentName]) {
            students.push(studentName);
            studentExists[studentName] = true;
        }
        
        // 检查该学生是否已有该学科成绩，如果有则更新
        bool subjectFound = false;
        for (uint i = 0; i < studentGrades[studentName].length; i++) {
            if (keccak256(bytes(studentGrades[studentName][i].subject)) == keccak256(bytes(subject))) {
                studentGrades[studentName][i].score = score;
                subjectFound = true;
                break;
            }
        }
        
        // 如果没有找到该学科，则添加新的成绩记录
        if (!subjectFound) {
            studentGrades[studentName].push(Grade(subject, score));
        }
    }
    
    // 获取学生所有学科成绩
    function getGrades(string memory studentName) public view returns (Grade[] memory) {
        return studentGrades[studentName];
    }
    
    // 获取所有学生列表
    function getAllStudents() public view returns (string[] memory) {
        return students;
    }
}
