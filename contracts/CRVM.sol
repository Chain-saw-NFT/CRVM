//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

/// @title Christian Rex van Minnen's NFT drop
/// @author exp.table
contract CRVM is ERC721, Ownable {
    using BitMaps for BitMaps.BitMap;

    bool public isOpened;
    uint256 public constant PRICE = 0.08 ether;
    uint256 public leftBlanks; // number of blanks left to be sold

    bytes32 private _merkleRoot;
    mapping (bytes32 => BitMaps.BitMap) private _claimed;

    constructor() ERC721("CRVM", "CRVM") {}

    function withdraw(address recipient) public onlyOwner {
        SafeTransferLib.safeTransferETH(recipient, address(this).balance);
    }

    function updateMerkleRoot(bytes32 newMerkleRoot) public onlyOwner {
        _merkleRoot = newMerkleRoot;
    }

    /**
        Mints all the 1/1s tokens at once, to be put on auction later.
    */
    function premint(address recipient) public onlyOwner {
        for(uint256 i = 0; i < 50; i++) {
            _safeMint(recipient, i);
        }
    }

    function releaseBlanks() public onlyOwner {
        leftBlanks += 2000;
        isOpened = false;
    }

    function premint(uint256 quantity, uint256 index, bytes32[] calldata proof) public payable {
        require(!_claimed[_merkleRoot].get(index),"Claimed already");
        require(quantity <= 10, "Limit of 10 per tx");
        bytes32 node = keccak256(abi.encodePacked(msg.sender, index));
        require(MerkleProof.verify(proof, _merkleRoot, leaf), "Invalid proof");
        _claimed[_merkleRoot].set(index);
        leftBlanks -= quantity; //will revert if not enough blanks left
        for(uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, i);
        }
    }

    function mintBlank(uint256 quantity) public payable {
        require(isOpened, "Closed");
        require(quantity * PRICE == msg.value, "Incorrect eth amount");
        require(quantity <= 10, "Limit of 10 per tx");
        leftBlanks -= quantity; //will revert if not enough blanks left
        for(uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, i);
        }
    }



}
