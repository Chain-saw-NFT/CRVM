const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256');
const fs = require('fs');
const ethers = require('ethers');
let data = require('../whitelist/whitelistInput.json');

let index = 0;
const resultJSON = {};
const rawAddressToLower = {};
const elements = [];

Object.values(data).forEach(rawAddress => {
  rawAddressToLower[rawAddress] = rawAddress.toLowerCase();
  const address = rawAddressToLower[rawAddress];
  resultJSON[address] = {};
  const paddedAmount = ethers.utils.hexZeroPad(ethers.utils.hexValue(1), 32);
  const paddedIndex = ethers.utils.hexZeroPad(ethers.utils.hexValue(index), 32);
  resultJSON[address].leaf = address + paddedIndex.substr(2);
  resultJSON[address].amount = 1;
  resultJSON[address].index = index++;
  elements.push(resultJSON[address].leaf)
});

const tree = new MerkleTree(elements, keccak256, { hashLeaves: true, sortPairs: true });

const root = tree.getHexRoot()
console.log(root)

let correct = true;
Object.values(data).forEach(rawAddress => {
  const address = rawAddressToLower[rawAddress];
  const leaf = keccak256(resultJSON[address].leaf);
  const proof = tree.getHexProof(leaf)
  correct = correct && tree.verify(proof, leaf, root);
  resultJSON[address].proof = proof;
});
console.log(`All proofs are correct : ${correct}`);
const json = JSON.stringify(resultJSON);
fs.writeFile('./whitelist/whitelistOutput.json', json, 'utf8', function() {});