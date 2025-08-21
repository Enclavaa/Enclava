// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EnclavaPayments is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    // Struct to store NFT metadata
    struct DatasetNFT {
        uint256 unclaimedAmount; // Amount available to claim
        uint256 totalEarned; // Total amount earned from dataset usage
        string datasetId; // Identifier of the dataset
        uint256 mintTimestamp; // When the NFT was minted
    }

    // Mapping from token ID to NFT metadata
    mapping(uint256 => DatasetNFT) public nftMetadata;

    event Payment(address indexed to, uint256 amount);
    event TotalPayment(uint256 amount);
    event DatasetNFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        string datasetId
    );
    event UnclaimedAmountUpdated(uint256 indexed tokenId, uint256 newAmount);
    event AmountClaimed(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount
    );
    event DatasetUsed(
        uint256 indexed tokenId,
        address indexed user,
        uint256 amount
    );

    constructor(
        address initialOwner
    ) ERC721("Enclava", "ENC") Ownable(initialOwner) {}

    /// @notice Function that will be used to mint an NFT for each user that uploads their dataset
    /// @param to Address of the user to mint the NFT to
    /// @param datasetId Identifier of the dataset
    function safeMint(
        address to,
        string memory datasetId
    ) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        // Initialize NFT metadata
        nftMetadata[tokenId] = DatasetNFT({
            unclaimedAmount: 0,
            totalEarned: 0,
            datasetId: datasetId,
            mintTimestamp: block.timestamp
        });

        emit DatasetNFTMinted(to, tokenId, datasetId);

        return tokenId;
    }

    /// @notice Function to pay for dataset usage - increases unclaimed amount for dataset owner
    /// @param tokenId The NFT token ID representing the dataset
    /// @param amount Amount to pay for using the dataset
    function payForDatasetUsage(
        uint256 tokenId,
        uint256 amount
    ) public payable nonReentrant {
        require(_ownerOf(tokenId) != address(0), "TOKEN_DOES_NOT_EXIST");
        require(msg.value == amount, "INCORRECT_PAYMENT_AMOUNT");
        require(amount > 0, "AMOUNT_MUST_BE_POSITIVE");

        // Update NFT metadata
        nftMetadata[tokenId].unclaimedAmount += amount;
        nftMetadata[tokenId].totalEarned += amount;

        emit DatasetUsed(tokenId, msg.sender, amount);
        emit UnclaimedAmountUpdated(
            tokenId,
            nftMetadata[tokenId].unclaimedAmount
        );
    }

    /// @notice Function to pay for multiple datasets usage
    /// @param tokenIds Array of NFT token IDs
    /// @param amounts Array of amounts to pay for each dataset
    function payForMultipleDatasets(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) public payable nonReentrant {
        require(tokenIds.length == amounts.length, "ARRAY_LENGTH_MISMATCH");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value == totalAmount, "INCORRECT_TOTAL_PAYMENT");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                _ownerOf(tokenIds[i]) != address(0),
                "TOKEN_DOES_NOT_EXIST"
            );
            require(amounts[i] > 0, "AMOUNT_MUST_BE_POSITIVE");

            // Update NFT metadata
            nftMetadata[tokenIds[i]].unclaimedAmount += amounts[i];
            nftMetadata[tokenIds[i]].totalEarned += amounts[i];

            emit DatasetUsed(tokenIds[i], msg.sender, amounts[i]);
            emit UnclaimedAmountUpdated(
                tokenIds[i],
                nftMetadata[tokenIds[i]].unclaimedAmount
            );
        }

        emit TotalPayment(totalAmount);
    }

    // @notice Function for NFT owner to claim their earnings
    /// @param tokenId The NFT token ID to claim from
    /// @param amount Amount to claim (must be <= unclaimedAmount)
    function claimEarnings(
        uint256 tokenId,
        uint256 amount
    ) public nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "NOT_TOKEN_OWNER");
        require(amount > 0, "AMOUNT_MUST_BE_POSITIVE");
        require(
            nftMetadata[tokenId].unclaimedAmount >= amount,
            "INSUFFICIENT_UNCLAIMED_AMOUNT"
        );
        require(
            address(this).balance >= amount,
            "INSUFFICIENT_CONTRACT_BALANCE"
        );

        // Update unclaimed amount
        nftMetadata[tokenId].unclaimedAmount -= amount;

        // Transfer the funds
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "TRANSFER_FAILED");

        emit AmountClaimed(tokenId, msg.sender, amount);
        emit UnclaimedAmountUpdated(
            tokenId,
            nftMetadata[tokenId].unclaimedAmount
        );
    }

    /// @notice Function for NFT owner to claim all their earnings from a token
    /// @param tokenId The NFT token ID to claim from
    function claimAllEarnings(uint256 tokenId) public nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "NOT_TOKEN_OWNER");

        uint256 amount = nftMetadata[tokenId].unclaimedAmount;
        require(amount > 0, "NO_UNCLAIMED_AMOUNT");
        require(
            address(this).balance >= amount,
            "INSUFFICIENT_CONTRACT_BALANCE"
        );

        // Reset unclaimed amount
        nftMetadata[tokenId].unclaimedAmount = 0;

        // Transfer the funds
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "TRANSFER_FAILED");

        emit AmountClaimed(tokenId, msg.sender, amount);
        emit UnclaimedAmountUpdated(tokenId, 0);
    }

    /// @notice Get NFT metadata
    /// @param tokenId The NFT token ID
    /// @return Metadata struct of the NFT
    function getNFTMetadata(
        uint256 tokenId
    ) public view returns (DatasetNFT memory) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_DOES_NOT_EXIST");
        return nftMetadata[tokenId];
    }

    /// @notice Get unclaimed amount for a specific token
    /// @param tokenId The NFT token ID
    /// @return Unclaimed amount
    function getUnclaimedAmount(uint256 tokenId) public view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_DOES_NOT_EXIST");
        return nftMetadata[tokenId].unclaimedAmount;
    }

    /// @notice Get all token IDs owned by an address (using ERC721Enumerable)
    /// @param owner The owner address
    /// @return Array of token IDs
    function getOwnerTokens(
        address owner
    ) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);

        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    // @notice Get total unclaimed amount for all tokens owned by an address
    /// @param owner The owner address
    /// @return Total unclaimed amount
    function getTotalUnclaimedByOwner(
        address owner
    ) public view returns (uint256) {
        uint256 tokenCount = balanceOf(owner);
        uint256 total = 0;

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            total += nftMetadata[tokenId].unclaimedAmount;
        }

        return total;
    }

    /// @notice Get total earned amount for all tokens owned by an address
    /// @param owner The owner address
    /// @return Total earned amount
    function getTotalEarnedByOwner(
        address owner
    ) public view returns (uint256) {
        uint256 tokenCount = balanceOf(owner);
        uint256 total = 0;

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            total += nftMetadata[tokenId].totalEarned;
        }

        return total;
    }

    /// @notice Claim all earnings from all tokens owned by the caller
    function claimAllEarningsFromAllTokens() public nonReentrant {
        uint256 tokenCount = balanceOf(msg.sender);
        require(tokenCount > 0, "NO_TOKENS_OWNED");

        uint256 totalToClaim = 0;
        uint256[] memory tokenIds = new uint256[](tokenCount);

        // Calculate total amount to claim and collect token IDs
        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(msg.sender, i);
            tokenIds[i] = tokenId;
            totalToClaim += nftMetadata[tokenId].unclaimedAmount;
        }

        require(totalToClaim > 0, "NO_UNCLAIMED_AMOUNT");
        require(
            address(this).balance >= totalToClaim,
            "INSUFFICIENT_CONTRACT_BALANCE"
        );

        // Reset unclaimed amounts for all tokens
        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 tokenAmount = nftMetadata[tokenId].unclaimedAmount;
            if (tokenAmount > 0) {
                nftMetadata[tokenId].unclaimedAmount = 0;
                emit AmountClaimed(tokenId, msg.sender, tokenAmount);
                emit UnclaimedAmountUpdated(tokenId, 0);
            }
        }

        // Transfer the total funds
        (bool sent, ) = msg.sender.call{value: totalToClaim}("");
        require(sent, "TRANSFER_FAILED");
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
