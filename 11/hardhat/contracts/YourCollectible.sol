// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract YourCollectible {
    // 管理员地址
    address public admin;
    
    // 学费金额（36 ETH，单位为wei）
    uint256 public constant TUITION_FEE = 36 ether;
    
    // 学生成绩结构
    struct Student {
        bool exists;
        string[] subjectNames;
        uint256[] scores;
        bool hasPaid; // 是否已缴费
    }
    
    // 学号到学生成绩的映射
    mapping(uint256 => Student) public students;
    
    // 事件声明
    event ScoreUpdated(uint256 indexed studentId, string[] subjectNames, uint256[] scores);
    event TuitionPaid(uint256 indexed studentId, address indexed payer, uint256 amount);
    event Withdrawal(address indexed admin, uint256 amount);
    
    // 构造函数，设置管理员为合约部署者
    constructor() {
        admin = msg.sender;
    }
    
    // 只有管理员才能调用的修饰器
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    // 设置新的管理员
    function setAdmin(address newAdmin) public onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        admin = newAdmin;
    }
    
    // 设置学生成绩
    function set(uint256 _studentId, string[] memory _subjectNames, uint256[] memory _scores) public {
        require(_subjectNames.length == _scores.length, "Subject count and score count must match");
        require(_subjectNames.length > 0, "At least one subject is required");
        
        // 存储学生信息，保留缴费状态
        bool hasPaid = students[_studentId].hasPaid;
        students[_studentId].exists = true;
        students[_studentId].subjectNames = _subjectNames;
        students[_studentId].scores = _scores;
        students[_studentId].hasPaid = hasPaid; // 保留原缴费状态
        
        emit ScoreUpdated(_studentId, _subjectNames, _scores);
    }

    // 批量设置多个学生成绩
    function setBatch(uint256[] memory _studentIds, string[][] memory _subjectNamesArray, uint256[][] memory _scoresArray) public {
        // 检查数组长度是否匹配
        require(_studentIds.length == _subjectNamesArray.length, "Student IDs count and subject names array count must match");
        require(_studentIds.length == _scoresArray.length, "Student IDs count and scores array count must match");
        
        // 批量设置每个学生的成绩
        for (uint i = 0; i < _studentIds.length; i++) {
            // 检查当前学生的科目名称和成绩数组长度是否匹配
            require(_subjectNamesArray[i].length == _scoresArray[i].length, "Subject count and score count must match for student");
            require(_subjectNamesArray[i].length > 0, "At least one subject is required for each student");
            
            // 存储学生信息，保留缴费状态
            bool hasPaid = students[_studentIds[i]].hasPaid;
            students[_studentIds[i]].exists = true;
            students[_studentIds[i]].subjectNames = _subjectNamesArray[i];
            students[_studentIds[i]].scores = _scoresArray[i];
            students[_studentIds[i]].hasPaid = hasPaid; // 保留原缴费状态
            
            emit ScoreUpdated(_studentIds[i], _subjectNamesArray[i], _scoresArray[i]);
        }
    }

    // 获取学生成绩和缴费状态
    function get(uint256 _studentId) public view returns (bool exists, string[] memory subjectNames, uint256[] memory scores, bool hasPaid) {
        Student storage student = students[_studentId];
        return (student.exists, student.subjectNames, student.scores, student.hasPaid);
    }
    
    // 缴纳学费函数 - payable使函数可以接收以太币
    function payTuition(uint256 _studentId) public payable {
        // 验证学生存在
        require(students[_studentId].exists, "Student does not exist");
        // 验证学生未缴费
        require(!students[_studentId].hasPaid, "Tuition already paid");
        // 验证支付金额等于学费
        require(msg.value == TUITION_FEE, "Payment must be exactly 36 ETH");
        
        // 更新学生缴费状态
        students[_studentId].hasPaid = true;
        
        // 触发缴费事件
        emit TuitionPaid(_studentId, msg.sender, msg.value);
    }
    
    // 检查学生是否已缴费
    function hasPaidTuition(uint256 _studentId) public view returns (bool) {
        return students[_studentId].exists && students[_studentId].hasPaid;
    }
    
    // 管理员提取合约中的全部以太币
    function withdraw() public onlyAdmin {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        // 防止重入攻击
        (bool success, ) = payable(admin).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(admin, balance);
    }
    
    // 获取合约余额
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
