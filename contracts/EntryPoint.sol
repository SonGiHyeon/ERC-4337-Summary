// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimpleAccount.sol";

// UserOperation[]을 받아서 검증(validateUserOp) → 실행(execute)

// UserOperation.callData는 SimpleAccount.execute(receiver, value, data)의 인코딩된 파라미터

contract EntryPoint {
    event OperationHandled(address indexed sender);

    function handleOps(
        UserOperation[] calldata ops,
        address payable /* beneficiary */
    ) external {
        for (uint256 i = 0; i < ops.length; i++) {
            UserOperation calldata op = ops[i];

            // 1. 유효성 검증
            uint256 validationResult = SimpleAccount(payable(op.sender))
                .validateUserOp(op, getUserOpHash(op), 0);
            require(validationResult == 0, "EntryPoint: validation failed");

            // 2. SimpleAccount.execute(...) 직접 호출
            (address dest, uint256 value, bytes memory func) = abi.decode(
                op.callData,
                (address, uint256, bytes)
            );
            SimpleAccount(payable(op.sender)).execute{gas: op.callGasLimit}(
                dest,
                value,
                func
            );

            emit OperationHandled(op.sender);
        }
    }

    function getUserOpHash(
        UserOperation calldata op
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    op.sender,
                    op.nonce,
                    op.initCode,
                    op.callData,
                    op.callGasLimit,
                    op.verificationGasLimit,
                    op.preVerificationGas,
                    op.maxFeePerGas,
                    op.maxPriorityFeePerGas,
                    op.paymasterAndData
                )
            );
    }
}
