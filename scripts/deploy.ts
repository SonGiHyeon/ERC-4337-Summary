import { ethers } from "hardhat";

async function main() {
    const [deployer, accountOwner] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();
    await entryPoint.waitForDeployment();
    const epAddress = await entryPoint.getAddress();

    const SimpleAccount = await ethers.getContractFactory("SimpleAccount");
    const account = await SimpleAccount.deploy(accountOwner.address, epAddress);
    await account.waitForDeployment();
    const accAddress = await account.getAddress();

    console.log("✅ EntryPoint:", epAddress);
    console.log("✅ SimpleAccount:", accAddress);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
