// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourCollectible {
    address public owner;
    uint256 public tuitionFee = 0.01 ether;
    mapping(address => uint256) public withdrawableBalance;

    // 定义事件
    event TuitionPaid(uint256 indexed studentId);
    event StudentInfoUpdated(uint256 indexed studentId);

    constructor() {
        owner = msg.sender;
    }

    // 学生成绩结构
    struct Student {
        bool exists;
        string[] subjectNames;
        uint256[] scores;
        bool hasPaidTuition;
        // 添加学生基本信息字段
        string name;
        string gender;
        string className;
    }
    
    // 学号到学生成绩的映射
    mapping(uint256 => Student) public students;
    
    // 设置学生成绩，接受不定参数
    // 参数格式: 学号, 课程1名称, 课程1成绩, 课程2名称, 课程2成绩...
    function set(uint256 _studentId, string[] memory _subjectNames, uint256[] memory _scores) public {
        // 移除学费缴纳检查
        // require(students[_studentId].hasPaidTuition, "Student must pay tuition first");
        require(_subjectNames.length == _scores.length, "Subject count and score count must match");
        require(_subjectNames.length > 0, "At least one subject is required");
        
        // 存储学生信息
        students[_studentId].exists = true;
        students[_studentId].subjectNames = _subjectNames;
        students[_studentId].scores = _scores;
    }

    // 批量设置多个学生成绩
    // 参数格式: 学号数组, 课程名称二维数组, 成绩二维数组
    function setBatch(uint256[] memory _studentIds, string[][] memory _subjectNamesArray, uint256[][] memory _scoresArray) public {
        // 移除学费缴纳检查
        // for (uint i = 0; i < _studentIds.length; i++) {
        //     require(students[_studentIds[i]].hasPaidTuition, "All students must pay tuition first");
        // }
        
        // 检查数组长度是否匹配
        require(_studentIds.length == _subjectNamesArray.length, "Student IDs count and subject names array count must match");
        require(_studentIds.length == _scoresArray.length, "Student IDs count and scores array count must match");
        
        // 批量设置每个学生的成绩
        for (uint i = 0; i < _studentIds.length; i++) {
            // 检查当前学生的科目名称和成绩数组长度是否匹配
            require(_subjectNamesArray[i].length == _scoresArray[i].length, "Subject count and score count must match for student");
            require(_subjectNamesArray[i].length > 0, "At least one subject is required for each student");
            
            // 存储学生信息
            students[_studentIds[i]].exists = true;
            students[_studentIds[i]].subjectNames = _subjectNamesArray[i];
            students[_studentIds[i]].scores = _scoresArray[i];
        }
    }

    // 新增：分批设置学生成绩，用于处理大量数据
    function setBatchChunked(uint256[] memory _studentIds, string[][] memory _subjectNamesArray, uint256[][] memory _scoresArray, uint256 startIndex, uint256 endIndex) public {
        require(startIndex < _studentIds.length && endIndex <= _studentIds.length, "Invalid index range");
        
        for (uint i = startIndex; i < endIndex; i++) {
            require(_subjectNamesArray[i].length == _scoresArray[i].length, "Subject count and score count must match for student");
            require(_subjectNamesArray[i].length > 0, "At least one subject is required for each student");
            
            // 存储学生信息
            students[_studentIds[i]].exists = true;
            students[_studentIds[i]].subjectNames = _subjectNamesArray[i];
            students[_studentIds[i]].scores = _scoresArray[i];
        }
    }

    // 新增：设置学生基本信息
    function setStudentInfo(uint256 _studentId, string memory _name, string memory _gender, string memory _className) public {
        students[_studentId].exists = true;
        students[_studentId].name = _name;
        students[_studentId].gender = _gender;
        students[_studentId].className = _className;
        
        emit StudentInfoUpdated(_studentId);
    }
    
    // 新增：批量设置学生基本信息
    function setStudentInfoBatch(uint256[] memory _studentIds, string[] memory _names, string[] memory _genders, string[] memory _classNames) public {
        require(_studentIds.length == _names.length, "Student IDs count and names count must match");
        require(_studentIds.length == _genders.length, "Student IDs count and genders count must match");
        require(_studentIds.length == _classNames.length, "Student IDs count and class names count must match");
        
        for (uint i = 0; i < _studentIds.length; i++) {
            students[_studentIds[i]].exists = true;
            students[_studentIds[i]].name = _names[i];
            students[_studentIds[i]].gender = _genders[i];
            students[_studentIds[i]].className = _classNames[i];
            
            emit StudentInfoUpdated(_studentIds[i]);
        }
    }

    // 获取学生成绩
    function get(uint256 _studentId) public view returns (bool exists, string[] memory subjectNames, uint256[] memory scores, bool tuitionPaid) {
        Student storage student = students[_studentId];
        return (student.exists, student.subjectNames, student.scores, student.hasPaidTuition);
    }
    
    // 新增：获取学生基本信息
    function getStudentInfo(uint256 _studentId) public view returns (bool exists, string memory name, string memory gender, string memory className) {
        Student storage student = students[_studentId];
        return (student.exists, student.name, student.gender, student.className);
    }

    // 检查学生是否缴纳学费
    function hasPaidTuition(uint256 _studentId) public view returns (bool) {
        return students[_studentId].hasPaidTuition;
    }

    // 转账功能
    function payTuition(uint256 _studentId) public payable {
        require(msg.value == tuitionFee, "Incorrect tuition fee amount");
        require(!students[_studentId].hasPaidTuition, "Tuition already paid");
        
        students[_studentId].hasPaidTuition = true;
        withdrawableBalance[owner] += msg.value;
        
        emit TuitionPaid(_studentId);
    }
    
    // 批量交学费功能
    function payTuitionBatch(uint256[] memory _studentIds) public payable {
        require(msg.value == tuitionFee * _studentIds.length, "Incorrect total tuition fee amount");
        
        for (uint i = 0; i < _studentIds.length; i++) {
            require(!students[_studentIds[i]].hasPaidTuition, "Some students have already paid tuition");
        }
        
        for (uint i = 0; i < _studentIds.length; i++) {
            students[_studentIds[i]].hasPaidTuition = true;
            emit TuitionPaid(_studentIds[i]);
        }
        
        withdrawableBalance[owner] += msg.value;
    }

    // 提现功能
    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 amount = withdrawableBalance[owner];
        require(amount > 0, "No balance to withdraw");
        
        withdrawableBalance[owner] = 0;
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}

