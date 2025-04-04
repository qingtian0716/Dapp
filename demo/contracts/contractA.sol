// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractA {
    uint256 private storedData;

    function set(uint256 x) public {
        storedData = x;
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}