// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ExampleExternalContract.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Staker 合约
 * @notice 一个允许用户质押 ETH 的合约
 */
contract Staker {
	// 将持有质押资金的外部合约
	ExampleExternalContract public exampleExternalContract;

	// NFT 凭证合约
	// StakingCertificate public certificate;

	// 用户质押资金的余额
	mapping(address => uint256) public balances;

	// 质押阈值
	uint256 public constant threshold = 1 ether;

	// 质押截止日期
	uint256 public deadline = block.timestamp + 3000 seconds;

	// 用户质押的时间
	mapping(address => uint256) public stakedAt;

	// uint256 public depositTimestamp = block.timestamp;

	// 合约事件
	event Stake(address indexed sender, uint256 amount);
	event Withdraw(address indexed user, uint256 amount);
	event Reward(address indexed user, uint256 amount);

	// 合约修饰符
	/**
	 * @notice 截止时间修饰符
	 * @param requireReached 检查截止日期是否已到
	 */
	modifier deadlineReached(bool requireReached) {
		uint256 timeRemaining = timeLeft();
		if (requireReached) {
			require(timeRemaining == 0, unicode"截止日期尚未到达");
		} else {
			require(timeRemaining > 0, unicode"截止日期已到达");
		}
		_;
	}

	/**
	 * @notice 外部合约状态修饰符
	 */
	modifier stakeNotCompleted() {
		bool completed = exampleExternalContract.completed();
		require(!completed, unicode"质押过程已完成");
		_;
	}

	/**
	 * @notice 合约构造函数
	 * @param exampleExternalContractAddress 将持有质押资金的外部合约地址
	 */
	constructor(address payable exampleExternalContractAddress) {
		exampleExternalContract = ExampleExternalContract(
			exampleExternalContractAddress
		);
	}

	/**
	 * @notice 执行外部合约的方法
	 */
	function execute() public stakeNotCompleted deadlineReached(true) {
		uint256 contractBalance = address(this).balance;

		// 检查合约当前ETH是否大于或者等于设定的阈值
		require(contractBalance >= threshold, unicode"未达到阈值");

		// 执行外部合约，将所有余额转移到合约
		(bool sent, ) = address(exampleExternalContract).call{
			value: contractBalance
		}(abi.encodeWithSignature("complete()"));
		require(sent, unicode"调用外部合约失败");  //安全审计修复
	}

	/**
	 * @notice 更新用户余额的质押方法
	 */
	function stake() public payable deadlineReached(false) stakeNotCompleted {
		// 检查用户的质押金额是否大于 0
		require(msg.value > 0, unicode"质押金额必须大于 0");

		// 检查合约是否有足够的余额支付奖励
		require(
			address(this).balance >= msg.value,
			unicode"账户余额不足,无法支付"
		);

		// 更新用户质押时间
		stakedAt[msg.sender] = block.timestamp;

		// 更新用户余额
		balances[msg.sender] += msg.value;

		// 触发事件，广播已正确质押了一些资金
		emit Stake(msg.sender, msg.value);
	}

	/**
	 * @notice 允许用户从合约中提取余额的方法，仅在截止日期已到但质押未完成时
	 */
	function withdraw() public deadlineReached(true) {
		uint256 userBalance = balances[msg.sender];

		// 检查用户是否有余额可提取
		require(userBalance > 0, unicode"您没有可提取的余额");

		// 检查外部合约是否已完成
		require(
			!exampleExternalContract.completed(),
			unicode"外部合约已完成，无法提取余额"
		);

		// 重置用户余额
		balances[msg.sender] = 0;
		// 重置用户质押时间
		stakedAt[msg.sender] = 0;

		// 将余额转回给用户
		(bool sent, ) = msg.sender.call{ value: userBalance }("");
		require(sent, unicode"将用户余额返还给用户失败");

		// 触发提取事件
		emit Withdraw(msg.sender, userBalance);
	}

	/**
	 * @notice 截止日期到达前剩余的秒数
	 */
	function timeLeft() public view returns (uint256 timeleft) {
		if (block.timestamp >= deadline) {
			return 0;
		} else {
			return deadline - block.timestamp;
		}
	}

	// 添加 `receive()` 特殊函数，接收 ETH 并调用 stake()
	receive() external payable {
		stake();
	}

	/**
	 * @notice 前端通过获取用户的质押时间来实时计算奖励
	 *  用户的奖励从前端传递到合约通过withdrawReward()方法提取
	 */
	function withdrawReward(uint256 amount) public {
		// 检查外部合约是否已完成
		require(
			exampleExternalContract.completed(),
			unicode"没有执行质押，无法提取奖励"
		);

		// 重置用户的质押时间
		// stakedAt[msg.sender] = block.timestamp; 前端重置

		// 外部合约转账奖励
		exampleExternalContract.payReward(payable(msg.sender), amount);

		// 触发提取事件
		emit Reward(msg.sender, amount);
	}
}
