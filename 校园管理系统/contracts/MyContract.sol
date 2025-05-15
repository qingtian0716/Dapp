// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    address public admin;
    mapping(address => bool) public teachers;
    mapping(address => uint256) public salaries;
    mapping(address => uint256) public lastPaymentTime;
    uint256 public constant PAYMENT_INTERVAL = 2 minutes;

    event SalaryPaid(address indexed teacher, uint256 amount);
    event TeacherAdded(address indexed teacher, uint256 salary);
    event TeacherRemoved(address indexed teacher);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addTeacher(address _teacher, uint256 _salary) external onlyAdmin {
        require(!teachers[_teacher], "Teacher already exists");
        teachers[_teacher] = true;
        salaries[_teacher] = _salary;
        lastPaymentTime[_teacher] = block.timestamp;
        emit TeacherAdded(_teacher, _salary);
    }

    function removeTeacher(address _teacher) external onlyAdmin {
        require(teachers[_teacher], "Teacher does not exist");
        delete teachers[_teacher];
        delete salaries[_teacher];
        delete lastPaymentTime[_teacher];
        emit TeacherRemoved(_teacher);
    }

    function paySalary(address _teacher) external {
        require(teachers[_teacher], "Not a valid teacher");
        require(block.timestamp >= lastPaymentTime[_teacher] + PAYMENT_INTERVAL, "Payment interval not reached");

        uint256 salary = salaries[_teacher];
        require(address(this).balance >= salary, "Insufficient contract balance");

        lastPaymentTime[_teacher] = block.timestamp;
        payable(_teacher).transfer(salary);
        emit SalaryPaid(_teacher, salary);
    }

    function checkPaymentTime(address _teacher) external view returns (uint256) {
        if (!teachers[_teacher]) return 0;
        if (block.timestamp >= lastPaymentTime[_teacher] + PAYMENT_INTERVAL) {
            return 0;
        } else {
            return (lastPaymentTime[_teacher] + PAYMENT_INTERVAL) - block.timestamp;
        }
    }

    function deposit() external payable onlyAdmin {}

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTeacherInfo(address _teacher) external view returns (bool isTeacher, uint256 salary, uint256 nextPaymentTime) {
        isTeacher = teachers[_teacher];
        salary = salaries[_teacher];
        nextPaymentTime = lastPaymentTime[_teacher] + PAYMENT_INTERVAL;
    }
}