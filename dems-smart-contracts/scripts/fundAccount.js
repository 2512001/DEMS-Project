const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("Funding account: 0xCd619Abb8228e65BbA8AcA9cbEDFD4a45F8afBCc with 1000 ETH total");
  console.log("From account:", signer.address);
  console.log("Initial balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH");

  const currentBalance = await ethers.provider.getBalance("0xCd619Abb8228e65BbA8AcA9cbEDFD4a45F8afBCc");
  console.log("Current balance of target account:", ethers.formatEther(currentBalance), "ETH");

  // Send 1000 ETH
  const tx = await signer.sendTransaction({
    to: "0xCd619Abb8228e65BbA8AcA9cbEDFD4a45F8afBCc",
    value: ethers.parseEther("1000.0") // Send 1000 ETH
  });

  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Transaction confirmed!");

  const newBalance = await ethers.provider.getBalance("0xCd619Abb8228e65BbA8AcA9cbEDFD4a45F8afBCc");
  console.log("New balance of funded account:", ethers.formatEther(newBalance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
