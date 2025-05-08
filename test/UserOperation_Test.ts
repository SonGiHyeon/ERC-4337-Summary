// ✅ 이 파일은 Paymaster + Bundler + EntryPoint + SimpleAccount 통합 테스트
// contracts/SimplePaymaster.sol, EntryPoint, SimpleAccount 를 기반으로 동작합니다.

import { ethers } from "hardhat";
import { expect } from "chai";
import {
    AbiCoder,
    keccak256,
    parseEther,
    parseUnits,
} from "ethers";
import { arrayify } from "@ethersproject/bytes";

describe("ERC-4337 Paymaster + Bundler Test", function () {
    let entryPoint: any;
    let paymaster: any;
    let account1: any;
    let account2: any;
    let deployer: any;
    let owner1: any;
    let owner2: any;
    let receiver: any;

    beforeEach(async () => {
        // 여기서는 테스트마다 공통으로 실행되는 초기화 작업을 설정합니다.
        // EntryPoint, Paymaster, SimpleAccount 배포와 초기 잔액 전송을 포함합니다.

        // 테스트용 지갑 4개를 가져옵니다. deployer는 배포자, owner1/owner2는 계정 소유자, receiver는 이더를 받을 계정입니다.
        [deployer, owner1, owner2, receiver] = await ethers.getSigners();

        const EntryPoint = await ethers.getContractFactory("EntryPoint");
        entryPoint = await EntryPoint.deploy();
        await entryPoint.waitForDeployment();

        const SimplePaymaster = await ethers.getContractFactory("SimplePaymaster");
        paymaster = await SimplePaymaster.deploy(await entryPoint.getAddress());
        await paymaster.waitForDeployment();

        await deployer.sendTransaction({
            to: await paymaster.getAddress(),
            value: parseEther("1"),
        });

        const SimpleAccount = await ethers.getContractFactory("SimpleAccount");
        account1 = await SimpleAccount.deploy(owner1.address, await entryPoint.getAddress());
        await account1.waitForDeployment();
        account2 = await SimpleAccount.deploy(owner2.address, await entryPoint.getAddress());
        await account2.waitForDeployment();

        await deployer.sendTransaction({ to: await account1.getAddress(), value: parseEther("0.1") });
        await deployer.sendTransaction({ to: await account2.getAddress(), value: parseEther("0.1") });
    });

    async function createUserOp(sender: any, callData: string, signer: any, paymasterAddr?: string) {
        const abi = new AbiCoder();
        const senderAddress = await sender.getAddress();

        const opFields = [
            "address", "uint256", "bytes", "bytes",
            "uint256", "uint256", "uint256",
            "uint256", "uint256", "bytes"
        ];

        const opValues = [
            senderAddress, 0, "0x", callData,
            100000, 100000, 21000,
            parseUnits("1", "gwei"), parseUnits("1", "gwei"),
            paymasterAddr ? paymasterAddr : "0x"
        ];

        const encoded = abi.encode(opFields, opValues);
        const userOpHash = keccak256(encoded);
        const signature = await signer.signMessage(arrayify(userOpHash));

        return {
            sender: senderAddress,
            nonce: 0,
            initCode: "0x",
            callData,
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 21000,
            maxFeePerGas: parseUnits("1", "gwei"),
            maxPriorityFeePerGas: parseUnits("1", "gwei"),
            paymasterAndData: paymasterAddr ? paymasterAddr : "0x",
            signature,
        };
    }

    it("✅ 1. UserOperation 하나가 정상 작동해야 한다", async () => {
        const abi = new AbiCoder();
        const callData = abi.encode(["address", "uint256", "bytes"], [receiver.address, parseEther("0.01"), "0x"]);
        const userOp = await createUserOp(account1, callData, owner1, await paymaster.getAddress());

        const before = await ethers.provider.getBalance(receiver.address);
        // 하나 또는 여러 개의 userOp를 EntryPoint에 전달하여 실행합니다. 여기서는 userOp 하나를 처리합니다.
        await entryPoint.handleOps([userOp], deployer.address);
        const after = await ethers.provider.getBalance(receiver.address);
        expect(after - before).to.equal(parseEther("0.01"));
    });

    it("✅ 2. 두 개 이상의 UserOperation을 bundling 처리할 수 있어야 한다", async () => {
        const abi = new AbiCoder();
        const callData1 = abi.encode(["address", "uint256", "bytes"], [receiver.address, parseEther("0.01"), "0x"]);
        const callData2 = abi.encode(["address", "uint256", "bytes"], [receiver.address, parseEther("0.02"), "0x"]);

        const userOp1 = await createUserOp(account1, callData1, owner1, await paymaster.getAddress());
        const userOp2 = await createUserOp(account2, callData2, owner2, await paymaster.getAddress());

        const before = await ethers.provider.getBalance(receiver.address);
        await entryPoint.handleOps([userOp1, userOp2], deployer.address);
        const after = await ethers.provider.getBalance(receiver.address);
        expect(after - before).to.equal(parseEther("0.03"));
    });

    it("✅ 3. paymaster 없이도 동작 가능해야 한다", async () => {
        const abi = new AbiCoder();
        const callData = abi.encode(["address", "uint256", "bytes"], [receiver.address, parseEther("0.01"), "0x"]);
        const userOp = await createUserOp(account1, callData, owner1); // no paymaster

        const before = await ethers.provider.getBalance(receiver.address);
        await entryPoint.handleOps([userOp], deployer.address);
        const after = await ethers.provider.getBalance(receiver.address);
        expect(after - before).to.equal(parseEther("0.01"));
    });
});
