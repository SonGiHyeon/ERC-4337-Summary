// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// owner의 서명으로만 동작할 수 있는 Account Abstraction 계정

// EntryPoint를 통해서만 execute() 가능 (require(msg.sender == EntryPoint))

// 구조체는 그대로 유지
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

interface IEntryPoint {
    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external;
}

abstract contract BaseAccount {
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256
    ) external virtual returns (uint256);

    function entryPoint() public view virtual returns (IEntryPoint);
}

contract SimpleAccount is BaseAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public owner;
    IEntryPoint private immutable _entryPoint;

    constructor(address _owner, IEntryPoint entryPoint_) {
        owner = _owner;
        _entryPoint = entryPoint_;
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 /* missingFunds */ // ❗ 사용 안 하므로 이름 제거
    ) external view override returns (uint256) {
        // stack pressure ↓: 최소한의 연산만 수행
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = hash.recover(userOp.signature);
        return recovered == owner ? 0 : 1;
    }

    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external {
        require(msg.sender == address(_entryPoint), "only entryPoint");
        (bool success, ) = dest.call{value: value}(func);
        require(success, "execution failed");
    }
    receive() external payable {}

    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }
}
