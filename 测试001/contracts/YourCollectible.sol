// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract YourCollectible {
    // 学生结构体
    struct Student {
        string name;
        mapping(bytes32 => uint256) scores;
        bool exists;
        address walletAddress;
    }
    
    // 成绩修改请求结构体
    struct ScoreRequest {
        address teacher;
        uint256 studentId;
        string subject;
        uint256 newScore;
        bool approved;
    }

    address public admin;
    mapping(address => bool) public teachers;
    mapping(uint256 => Student) private students;
    ScoreRequest[] public pendingRequests;

    // 事件集合
    event StudentAdded(uint256 indexed studentId, string name);
    event TeacherAdded(address indexed teacher);
    event ScoreUpdated(uint256 indexed studentId, string subject, uint256 score);
    event ScoreUpdateRequested(uint256 indexed requestId, address indexed teacher);
    event RequestApproved(uint256 indexed requestId);

    // 权限修饰符
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyTeacher() {
        require(teachers[msg.sender], "Only teacher");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin address");
        admin = _admin;
        teachers[_admin] = true;
    }

    // 核心功能保持不变
    function addTeacher(address _teacher) external onlyAdmin {
        require(_teacher != address(0) && !teachers[_teacher], "Invalid teacher");
        teachers[_teacher] = true;
        emit TeacherAdded(_teacher);
    }

    function addStudent(uint256 _studentId, string calldata _name, address _walletAddress) external onlyTeacher {
        require(!students[_studentId].exists, "Student exists");
        require(_walletAddress != address(0), "Invalid wallet address");
        students[_studentId].name = _name;
        students[_studentId].exists = true;
        students[_studentId].walletAddress = _walletAddress;
        emit StudentAdded(_studentId, _name);
    }

    // 新增学生自助注册功能
    function registerStudent(uint256 _studentId, string calldata _name) external {
        require(!students[_studentId].exists, "Student exists");
        students[_studentId].name = _name;
        students[_studentId].exists = true;
        students[_studentId].walletAddress = msg.sender;
        emit StudentAdded(_studentId, _name);
    }

    // 成绩更新功能扩展
    function updateScore(uint256 _studentId, string calldata _subject, uint256 _score) external onlyTeacher {
        require(students[_studentId].exists, "Student not found");
        require(_score <= 100, "Invalid score");
        students[_studentId].scores[keccak256(abi.encodePacked(_subject))] = _score;
        emit ScoreUpdated(_studentId, _subject, _score);
    }

    // 新增成绩修改请求功能
    function requestScoreUpdate(uint256 _studentId, string calldata _subject, uint256 _newScore) external onlyTeacher {
        require(students[_studentId].exists, "Student not found");
        pendingRequests.push(ScoreRequest({
            teacher: msg.sender,
            studentId: _studentId,
            subject: _subject,
            newScore: _newScore,
            approved: false
        }));
        emit ScoreUpdateRequested(pendingRequests.length - 1, msg.sender);
    }

    // 获取学生信息
    function getStudentInfo(uint256 _studentId) external view returns (string memory name, address walletAddress, bool exists) {
        require(students[_studentId].exists, "Student not found");
        return (students[_studentId].name, students[_studentId].walletAddress, students[_studentId].exists);
    }

    // 管理员审批功能
    function approveRequest(uint256 _requestId) external onlyAdmin {
        ScoreRequest storage request = pendingRequests[_requestId];
        require(!request.approved, "Request already approved");
        
        students[request.studentId].scores[keccak256(abi.encodePacked(request.subject))] = request.newScore;
        request.approved = true;
        emit RequestApproved(_requestId);
    }

    function getScore(uint256 _studentId, string calldata _subject) external view returns (uint256) {
        require(students[_studentId].exists, "Student not found");
        return students[_studentId].scores[keccak256(abi.encodePacked(_subject))];
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin");
        admin = _newAdmin;
    }
    
    // 获取用户角色函数
    function getUserRole(address _user) external view returns (string memory) {
        if (_user == admin) {
            return "admin";
        } else if (teachers[_user]) {
            return "teacher";
        } else {
            return "student";
        }
    }
}