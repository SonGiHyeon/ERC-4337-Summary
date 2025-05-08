// ===== SimplePaymaster.sol =====
contract SimplePaymaster {
    address public immutable entryPoint;

    // ===== UserOperation 구조체 =====
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

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    function validatePaymasterUserOp(
        UserOperation calldata,
        bytes32,
        uint256
    ) external view returns (bytes memory, uint256) {
        require(msg.sender == entryPoint, "only entryPoint");
        return ("", 0);
    }

    function postOp(bytes calldata, bool, uint256) external {
        require(msg.sender == entryPoint, "only entryPoint");
    }

    receive() external payable {}
}
