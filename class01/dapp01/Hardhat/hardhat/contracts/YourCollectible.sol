// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract YourCollectible {
    uint256 private value;

    // 设置值
    function set(uint256 _value) public {
        value = _value;
    }

    // 获取值
    function get() public view returns (uint256) {
        return value;
    }
}
