// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ExampleExternalContract {
	// 完成状态
	bool public completed;
	// 接收到的总金额
	uint256 public totalReceived;

	// 定义一个事件来记录每次调用 complete 方法时的详细信息
	event Completed(address indexed sender, uint256 amount);

	/**
	 * @notice 完成质押操作的函数，只能被调用一次
	 * @dev 接收ETH并标记操作完成
	 */
	function complete() external payable {
		// 更新完成状态
		completed = true;

		// 记录接收到的ETH金额（通过msg.value获取）
		totalReceived += msg.value;

		// 触发事件，记录调用者地址和接收的金额
		emit Completed(msg.sender, msg.value);
	}

	/**
	 * @notice 用于获取合约的ETH余额
	 * @return 合约的ETH余额
	 */
	function getBalance(
		address contractAddress
	) external view returns (uint256) {
		return contractAddress.balance;
	}

	/**
	 * @notice 允许合约直接接收ETH（安全后备）
	 */
	receive() external payable {
		    // 检查合约是否有足够的余额支付奖励
    require(address(this).balance >= msg.value, unicode"账户余额不足,无法支付");
		totalReceived += msg.value;
	}

    
    /**
     * @notice 将奖励转移给用户
     * @param user 用户地址
     * @param amount 奖励金额
     */
	function payReward(address payable user, uint256 amount) external {
		// 检查合约是否有足够的余额支付奖励
		require(address(this).balance >= amount, unicode"奖励池余额不足,无法支付");

		// 转移奖励给用户
		(bool sent,) = user.call{value: amount}("");
		require(sent, unicode"将奖励转移给用户失败");
	}
}
