//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

/// @title Christian Rex van Minnen's NFT drop
/// @author exp.table
contract CRVM is ERC721, Ownable {
    using Strings for uint256;
    using BitMaps for BitMaps.BitMap;

    bool public isOpened;
    uint256 public constant PRICE = 0.08 ether;

    uint256 private constant _SEPARATOR = 2000;
    uint256 private _dropId;
    bytes32 private _merkleRoot;
    string private _baseTokenURI = "ipfs://";
    string private _ipfsCID;
    mapping (bytes32 => BitMaps.BitMap) private _claimed;
    mapping (uint256 => uint256) private _leftBlanks;

    constructor() ERC721("CRVM", "CRVM") {}

    function withdraw(address recipient) public onlyOwner {
        SafeTransferLib.safeTransferETH(recipient, address(this).balance);
    }

    function updateMerkleRoot(bytes32 newMerkleRoot) public onlyOwner {
        _merkleRoot = newMerkleRoot;
    }

    function setBaseURI(string calldata baseTokenURI) public onlyOwner {
        _baseTokenURI = baseTokenURI;
    }

    function updateCID(string calldata newCID) public onlyOwner {
        _ipfsCID = newCID;
    }

    function flipOpen() public onlyOwner {
        isOpened = !isOpened;
    }

    /// @notice Mints "core" tokens, 10 per drop, until all 5 drops are done
    function coreMint(address recipient, string calldata newCID, bytes32 newMerkleRoot) public onlyOwner {
        uint256 dropId = _dropId++;
        require(dropId < 5);
        _leftBlanks[dropId] = 2000;
        isOpened = false;
        _ipfsCID = newCID;
        _merkleRoot = newMerkleRoot;
        for(uint256 i = 10*dropId; i < 10*dropId + 10; i++) {
            _safeMint(recipient, i);
        }
    }

    function _internalMint(uint256 dropId, address recipient, uint256 quantity) internal {
        uint256 start = (dropId+1) * _SEPARATOR + (_SEPARATOR - _leftBlanks[dropId]);
        for(uint256 i = 0; i < quantity; i++) {
            _safeMint(recipient, start+i);
        }
        _leftBlanks[dropId] -= quantity;
    }

    /// @notice Merkle tree members can buy before everyone else
    /// @dev Users can buy it as soon as data is available, not according to isOpened
    function merkleMint(uint256 dropId, uint256 quantity, uint256 index, bytes32[] calldata proof) public payable {
        require(!_claimed[_merkleRoot].get(index),"Claimed already");
        require(quantity <= 10, "Limit of 10 per tx");
        bytes32 node = keccak256(abi.encodePacked(msg.sender, index));
        require(MerkleProof.verify(proof, _merkleRoot, node), "Invalid proof");
        _claimed[_merkleRoot].set(index);
        _internalMint(dropId, msg.sender, quantity);
    }

    /// @notice Public minting of the blanks
    function publicMint(uint256 dropId, uint256 quantity) public payable {
        require(isOpened, "Closed");
        require(quantity * PRICE == msg.value, "Incorrect eth amount");
        require(quantity <= 10, "Limit of 10 per tx");
        _internalMint(dropId, msg.sender, quantity);
    }

    function tokenURI(uint256 tokenId) public override view returns (string memory) {
        if (tokenId < 50) {
            return string(abi.encodePacked(_baseTokenURI, _ipfsCID, "/", tokenId.toString()));
        } else {
            uint256 blankId = (tokenId / _SEPARATOR) * _SEPARATOR; // produce 2000 | 4000 | ... | 10000
            return string(abi.encodePacked(_baseTokenURI, _ipfsCID, "/", blankId.toString()));
        }
    }

    function burn(uint256 tokenId) public virtual {
        require(_isApprovedOrOwner(msg.sender, tokenId), "caller is not owner nor approved");
        _burn(tokenId);
    }

}
