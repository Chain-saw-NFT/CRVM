const { expect } = require("chai");
const { waffle } = require("hardhat");
const provider = waffle.provider;
const whitelist1 = require('./whitelist1.json');
const whitelist2 = require('./whitelist2.json');

const MAX_MINTS = 5;
const MINT_PRICE = 0.1;

function getPrice(price) {
  return (price * (10**18)).toString();
}

describe("CRVM", function () {
  let owner, client1, client2, crvm, crvm1, crvm2;

  const merkleRoot1 = "0xf704c969678468a7533f5fb7516de020fb9073aa0cdd921ff66a200d0a0f6798";
  const merkleRoot2 = "0x916877b3e7c7f9b6a17e44385ae52f8cb7c7c25ce01f1cc1f0f67ae71d555388";

  before(async function () {
    [owner, client1, client2] = await ethers.getSigners();

    const CRVM = await ethers.getContractFactory("CRVM");
    crvm = await CRVM.deploy();
    await crvm.deployed();

    crvm1 = await crvm.connect(client1);
    crvm2 = await crvm.connect(client2);
  });

  it("Drop #0 - Can't buy in public sale when closed", async function () {
    await expect(crvm1.publicMint(0, 2, {value:getPrice(2*MINT_PRICE)})).to.be.revertedWith("Closed");
  });

  it("Drop #0 - Owner calls coreMint", async function() {
    await crvm.coreMint(owner.address, "a", merkleRoot1);
    //10 tokens should have been minted
    expect(await crvm.balanceOf(owner.address)).to.equal(10);
    //tokenURI test
    expect(await crvm.tokenURI(9)).to.equal("ipfs://a/9");
  });

  it("Drop #0 - Can't buy into public sale with wrong price", async function() {
    await crvm.flipOpen();
    await expect(crvm1.publicMint(0, 2, {value:getPrice(MINT_PRICE)})).to.be.revertedWith("Incorrect eth amount");
  });

  it("Drop #0 - Can buy into public sale", async function() {
    await crvm1.publicMint(0, 2, {value:getPrice(2*MINT_PRICE)});
    //check balance
    expect(await crvm.balanceOf(client1.address)).to.equal(2);
    //check tokenURI
    expect(await crvm.tokenURI(2000)).to.equal("ipfs://a/2000");
    expect(await crvm.tokenURI(2001)).to.equal("ipfs://a/2000");
  });

  it("Drop #0 - Can buy into merkle mint", async function() {
    const data = whitelist1[client1.address.toLowerCase()];
    await crvm1.merkleMint(0, 4, data.index, data.proof, {value:getPrice(4*MINT_PRICE)});
    //check balance
    expect(await crvm.balanceOf(client1.address)).to.equal(6);
  });

  it("Drop #0 - Cannot rebuy into merkle mint", async function() {
    const data = whitelist1[client1.address.toLowerCase()];
    await expect(crvm1.merkleMint(0, 3, data.index, data.proof, {value:getPrice(3*MINT_PRICE)})).to.be.revertedWith("Claimed already");
  });

  it("Drop #0 - Blanks sale from drop 0 sold out", async function() {
    for(let i = 0 ; i < 199; i++) await crvm1.publicMint(0, MAX_MINTS, {value:getPrice(MAX_MINTS*MINT_PRICE)});
    await expect(crvm1.publicMint(0, MAX_MINTS, {value:getPrice(MAX_MINTS*MINT_PRICE)})).to.be.reverted;
  });

  it("Drop #1 - core mint", async function() {
    await crvm.coreMint(owner.address, "b", merkleRoot2);
    //10 tokens should have been minted + 10 from before
    expect(await crvm.balanceOf(owner.address)).to.equal(20);
    //tokenURI test of previous batch
    expect(await crvm.tokenURI(9)).to.equal("ipfs://b/9");
    //tokenURI test of new batch
    expect(await crvm.tokenURI(15)).to.equal("ipfs://b/15");
    expect(await crvm.isOpened()).to.equal(false);
  });

  it("Drop #1 - cannot use previous merkle proof to mint", async function() {
    const data = whitelist1[client1.address.toLowerCase()];
    await expect(crvm1.merkleMint(1, 2, data.index, data.proof, {value:getPrice(2*MINT_PRICE)})).to.be.revertedWith("Invalid proof");
  });

  it("Drop #1 - public mint + tokenURI", async function() {
    await crvm.flipOpen();
    await crvm2.publicMint(1, 2, {value:getPrice(2*MINT_PRICE)});
    //check balance
    expect(await crvm.balanceOf(client2.address)).to.equal(2);
    //check tokenURI
    expect(await crvm.tokenURI(4000)).to.equal("ipfs://b/4000");
    expect(await crvm.tokenURI(4001)).to.equal("ipfs://b/4000");
  });

  it("Owner cannot create more than 5 drops", async function() {
    for(let i = 0; i < 3; i++) await crvm.coreMint(owner.address, "c", merkleRoot2);
    await expect(crvm.coreMint(owner.address, "c", merkleRoot2)).to.be.reverted;
  });

  it("Withdraw eth", async function() {
    const preBalance = await provider.getBalance(crvm.address);
    await crvm.withdraw("0xd2927a91570146218ed700566df516d67c5ecfab");
    expect(await provider.getBalance("0xd2927a91570146218ed700566df516d67c5ecfab")).to.be.equal(preBalance.toString());
  });

  it("Can burn token", async function() {
    await expect(crvm.burn(4000)).to.be.reverted;
    await crvm2.burn(4000);
    expect(await crvm.balanceOf(client2.address)).to.equal(1);
  });


});
