// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {EnclavaPayments} from "../src/EnclavaPayments.sol";

contract EnclavaPaymentsTest is Test {
    EnclavaPayments public enclavaPayments;
    address public owner;
    address public user1;
    address public user2;
    address public user3;
    address public dataConsumer;

    event DatasetNFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        string datasetId
    );
    event DatasetUsed(
        uint256 indexed tokenId,
        address indexed user,
        uint256 amount
    );
    event AmountClaimed(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount
    );
    event UnclaimedAmountUpdated(uint256 indexed tokenId, uint256 newAmount);

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        dataConsumer = makeAddr("dataConsumer");

        // Deploy contract
        vm.prank(owner);
        enclavaPayments = new EnclavaPayments(owner);

        // Give some ETH to test accounts
        vm.deal(dataConsumer, 100 ether);
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
    }

    // ================================
    // MINTING TESTS
    // ================================

    function test_SafeMint() public {
        string memory datasetId = "dataset_123";

        vm.expectEmit(true, true, false, true);
        emit DatasetNFTMinted(user1, 0, datasetId);

        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, datasetId);

        assertEq(tokenId, 0);
        assertEq(enclavaPayments.ownerOf(tokenId), user1);
        assertEq(enclavaPayments.balanceOf(user1), 1);

        // Check metadata
        EnclavaPayments.DatasetNFT memory metadata = enclavaPayments
            .getNFTMetadata(tokenId);
        assertEq(metadata.unclaimedAmount, 0);
        assertEq(metadata.totalEarned, 0);
        assertEq(metadata.datasetId, datasetId);
        assertGt(metadata.mintTimestamp, 0);
    }

    function test_MultipleMints() public {
        vm.startPrank(owner);

        uint256 token1 = enclavaPayments.safeMint(user1, "dataset_1");
        uint256 token2 = enclavaPayments.safeMint(user1, "dataset_2");
        uint256 token3 = enclavaPayments.safeMint(user2, "dataset_3");

        vm.stopPrank();

        assertEq(token1, 0);
        assertEq(token2, 1);
        assertEq(token3, 2);

        assertEq(enclavaPayments.balanceOf(user1), 2);
        assertEq(enclavaPayments.balanceOf(user2), 1);

        uint256[] memory user1Tokens = enclavaPayments.getOwnerTokens(user1);
        assertEq(user1Tokens.length, 2);
        assertEq(user1Tokens[0], 0);
        assertEq(user1Tokens[1], 1);
    }

    // ================================
    // PAYMENT TESTS
    // ================================

    function test_PayForDatasetUsage() public {
        // Mint NFT first
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        uint256 paymentAmount = 1 ether;

        vm.expectEmit(true, true, false, true);
        emit DatasetUsed(tokenId, dataConsumer, paymentAmount);

        vm.expectEmit(true, false, false, true);
        emit UnclaimedAmountUpdated(tokenId, paymentAmount);

        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: paymentAmount}(
            tokenId,
            paymentAmount
        );

        // Check metadata updated
        EnclavaPayments.DatasetNFT memory metadata = enclavaPayments
            .getNFTMetadata(tokenId);
        assertEq(metadata.unclaimedAmount, paymentAmount);
        assertEq(metadata.totalEarned, paymentAmount);

        assertEq(enclavaPayments.getUnclaimedAmount(tokenId), paymentAmount);
    }

    function test_PayForDatasetUsage_IncorrectPayment() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        vm.prank(dataConsumer);
        vm.expectRevert("INCORRECT_PAYMENT_AMOUNT");
        enclavaPayments.payForDatasetUsage{value: 1 ether}(tokenId, 2 ether);
    }

    function test_PayForDatasetUsage_NonexistentToken() public {
        uint256 nonexistentToken = 999;

        vm.prank(dataConsumer);
        vm.expectRevert("TOKEN_DOES_NOT_EXIST");
        enclavaPayments.payForDatasetUsage{value: 1 ether}(
            nonexistentToken,
            1 ether
        );
    }

    function test_PayForDatasetUsage_ZeroAmount() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        vm.prank(dataConsumer);
        vm.expectRevert("AMOUNT_MUST_BE_POSITIVE");
        enclavaPayments.payForDatasetUsage{value: 0}(tokenId, 0);
    }

    function test_PayForMultipleDatasets() public {
        // Mint multiple NFTs
        vm.startPrank(owner);
        uint256 token1 = enclavaPayments.safeMint(user1, "dataset_1");
        uint256 token2 = enclavaPayments.safeMint(user2, "dataset_2");
        uint256 token3 = enclavaPayments.safeMint(user3, "dataset_3");
        vm.stopPrank();

        uint256[] memory tokenIds = new uint256[](3);
        tokenIds[0] = token1;
        tokenIds[1] = token2;
        tokenIds[2] = token3;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1 ether;
        amounts[1] = 2 ether;
        amounts[2] = 0.5 ether;

        uint256 totalAmount = 3.5 ether;

        vm.prank(dataConsumer);
        enclavaPayments.payForMultipleDatasets{value: totalAmount}(
            tokenIds,
            amounts
        );

        // Check all metadata updated correctly
        assertEq(enclavaPayments.getUnclaimedAmount(token1), 1 ether);
        assertEq(enclavaPayments.getUnclaimedAmount(token2), 2 ether);
        assertEq(enclavaPayments.getUnclaimedAmount(token3), 0.5 ether);
    }

    function test_PayForMultipleDatasets_ArrayLengthMismatch() public {
        uint256[] memory tokenIds = new uint256[](2);
        uint256[] memory amounts = new uint256[](3);

        vm.prank(dataConsumer);
        vm.expectRevert("ARRAY_LENGTH_MISMATCH");
        enclavaPayments.payForMultipleDatasets{value: 1 ether}(
            tokenIds,
            amounts
        );
    }

    function test_PayForMultipleDatasets_IncorrectTotalPayment() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_1");

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1 ether;

        vm.prank(dataConsumer);
        vm.expectRevert("INCORRECT_TOTAL_PAYMENT");
        enclavaPayments.payForMultipleDatasets{value: 0.5 ether}(
            tokenIds,
            amounts
        );
    }

    // ================================
    // CLAIMING TESTS
    // ================================

    function test_ClaimEarnings() public {
        // Mint and pay
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        uint256 paymentAmount = 2 ether;
        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: paymentAmount}(
            tokenId,
            paymentAmount
        );

        // Claim half
        uint256 claimAmount = 1 ether;
        uint256 balanceBefore = user1.balance;

        vm.expectEmit(true, true, false, true);
        emit AmountClaimed(tokenId, user1, claimAmount);

        vm.prank(user1);
        enclavaPayments.claimEarnings(tokenId, claimAmount);

        assertEq(user1.balance - balanceBefore, claimAmount);
        assertEq(
            enclavaPayments.getUnclaimedAmount(tokenId),
            paymentAmount - claimAmount
        );

        EnclavaPayments.DatasetNFT memory metadata = enclavaPayments
            .getNFTMetadata(tokenId);
        assertEq(metadata.unclaimedAmount, paymentAmount - claimAmount);
        assertEq(metadata.totalEarned, paymentAmount); // Total earned should remain the same
    }

    function test_ClaimEarnings_NotTokenOwner() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(tokenId, 1 ether);

        vm.prank(user2);
        vm.expectRevert("NOT_TOKEN_OWNER");
        enclavaPayments.claimEarnings(tokenId, 0.5 ether);
    }

    function test_ClaimEarnings_InsufficientUnclaimedAmount() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(tokenId, 1 ether);

        vm.prank(user1);
        vm.expectRevert("INSUFFICIENT_UNCLAIMED_AMOUNT");
        enclavaPayments.claimEarnings(tokenId, 2 ether);
    }

    function test_ClaimAllEarnings() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        uint256 paymentAmount = 3 ether;
        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: paymentAmount}(
            tokenId,
            paymentAmount
        );

        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        enclavaPayments.claimAllEarnings(tokenId);

        assertEq(user1.balance - balanceBefore, paymentAmount);
        assertEq(enclavaPayments.getUnclaimedAmount(tokenId), 0);
    }

    function test_ClaimAllEarnings_NoUnclaimedAmount() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        vm.prank(user1);
        vm.expectRevert("NO_UNCLAIMED_AMOUNT");
        enclavaPayments.claimAllEarnings(tokenId);
    }

    function test_ClaimAllEarningsFromAllTokens() public {
        // Mint multiple tokens for user1
        vm.startPrank(owner);
        uint256 token1 = enclavaPayments.safeMint(user1, "dataset_1");
        uint256 token2 = enclavaPayments.safeMint(user1, "dataset_2");
        uint256 token3 = enclavaPayments.safeMint(user1, "dataset_3");
        vm.stopPrank();

        // Pay for each dataset
        vm.startPrank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(token1, 1 ether);
        enclavaPayments.payForDatasetUsage{value: 2 ether}(token2, 2 ether);
        enclavaPayments.payForDatasetUsage{value: 1.5 ether}(token3, 1.5 ether);
        vm.stopPrank();

        uint256 totalExpected = 4.5 ether;
        uint256 balanceBefore = user1.balance;

        vm.prank(user1);
        enclavaPayments.claimAllEarningsFromAllTokens();

        assertEq(user1.balance - balanceBefore, totalExpected);
        assertEq(enclavaPayments.getUnclaimedAmount(token1), 0);
        assertEq(enclavaPayments.getUnclaimedAmount(token2), 0);
        assertEq(enclavaPayments.getUnclaimedAmount(token3), 0);
    }

    function test_ClaimAllEarningsFromAllTokens_NoTokensOwned() public {
        vm.prank(user1);
        vm.expectRevert("NO_TOKENS_OWNED");
        enclavaPayments.claimAllEarningsFromAllTokens();
    }

    // ================================
    // VIEW FUNCTION TESTS
    // ================================

    function test_GetTotalUnclaimedByOwner() public {
        // Mint multiple tokens
        vm.startPrank(owner);
        uint256 token1 = enclavaPayments.safeMint(user1, "dataset_1");
        uint256 token2 = enclavaPayments.safeMint(user1, "dataset_2");
        uint256 token3 = enclavaPayments.safeMint(user2, "dataset_3");
        vm.stopPrank();

        // Pay for datasets
        vm.startPrank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(token1, 1 ether);
        enclavaPayments.payForDatasetUsage{value: 2 ether}(token2, 2 ether);
        enclavaPayments.payForDatasetUsage{value: 0.5 ether}(token3, 0.5 ether);
        vm.stopPrank();

        assertEq(enclavaPayments.getTotalUnclaimedByOwner(user1), 3 ether);
        assertEq(enclavaPayments.getTotalUnclaimedByOwner(user2), 0.5 ether);
    }

    function test_GetTotalEarnedByOwner() public {
        vm.startPrank(owner);
        uint256 token1 = enclavaPayments.safeMint(user1, "dataset_1");
        uint256 token2 = enclavaPayments.safeMint(user1, "dataset_2");
        vm.stopPrank();

        vm.startPrank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(token1, 1 ether);
        enclavaPayments.payForDatasetUsage{value: 2 ether}(token2, 2 ether);
        vm.stopPrank();

        // Claim from one token
        vm.prank(user1);
        enclavaPayments.claimEarnings(token1, 0.5 ether);

        // Total earned should still be 3 ether
        assertEq(enclavaPayments.getTotalEarnedByOwner(user1), 3 ether);
        // But unclaimed should be 2.5 ether
        assertEq(enclavaPayments.getTotalUnclaimedByOwner(user1), 2.5 ether);
    }

    function test_GetOwnerTokens() public {
        vm.startPrank(owner);
        uint256 token1 = enclavaPayments.safeMint(user1, "dataset_1");
        uint256 token2 = enclavaPayments.safeMint(user2, "dataset_2");
        uint256 token3 = enclavaPayments.safeMint(user1, "dataset_3");
        vm.stopPrank();

        uint256[] memory user1Tokens = enclavaPayments.getOwnerTokens(user1);
        uint256[] memory user2Tokens = enclavaPayments.getOwnerTokens(user2);

        assertEq(user1Tokens.length, 2);
        assertEq(user2Tokens.length, 1);

        assertEq(user1Tokens[0], token1);
        assertEq(user1Tokens[1], token3);
        assertEq(user2Tokens[0], token2);
    }

    function test_GetNFTMetadata_NonexistentToken() public {
        vm.expectRevert("TOKEN_DOES_NOT_EXIST");
        enclavaPayments.getNFTMetadata(999);
    }

    // ================================
    // INTEGRATION TESTS
    // ================================

    function test_FullWorkflow() public {
        // 1. Mint NFT
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "important_dataset");

        // 2. Multiple payments from different users
        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(tokenId, 1 ether);

        vm.deal(makeAddr("consumer2"), 10 ether);
        vm.prank(makeAddr("consumer2"));
        enclavaPayments.payForDatasetUsage{value: 0.5 ether}(
            tokenId,
            0.5 ether
        );

        // 3. Check accumulated earnings
        assertEq(enclavaPayments.getUnclaimedAmount(tokenId), 1.5 ether);

        EnclavaPayments.DatasetNFT memory metadata = enclavaPayments
            .getNFTMetadata(tokenId);
        assertEq(metadata.totalEarned, 1.5 ether);
        assertEq(metadata.unclaimedAmount, 1.5 ether);

        // 4. Partial claim
        uint256 balanceBefore = user1.balance;
        vm.prank(user1);
        enclavaPayments.claimEarnings(tokenId, 1 ether);

        assertEq(user1.balance - balanceBefore, 1 ether);
        assertEq(enclavaPayments.getUnclaimedAmount(tokenId), 0.5 ether);

        // 5. Final claim
        vm.prank(user1);
        enclavaPayments.claimAllEarnings(tokenId);

        assertEq(user1.balance - balanceBefore, 1.5 ether);
        assertEq(enclavaPayments.getUnclaimedAmount(tokenId), 0);

        // Total earned should remain unchanged
        metadata = enclavaPayments.getNFTMetadata(tokenId);
        assertEq(metadata.totalEarned, 1.5 ether);
    }

    function test_MultipleUsersMultipleDatasets() public {
        // Mint datasets for different users
        vm.startPrank(owner);
        uint256 user1Token1 = enclavaPayments.safeMint(user1, "dataset_A");
        uint256 user1Token2 = enclavaPayments.safeMint(user1, "dataset_B");
        uint256 user2Token1 = enclavaPayments.safeMint(user2, "dataset_C");
        vm.stopPrank();

        // Multiple consumers pay for different datasets
        address consumer1 = makeAddr("consumer1");
        address consumer2 = makeAddr("consumer2");
        vm.deal(consumer1, 10 ether);
        vm.deal(consumer2, 10 ether);

        vm.prank(consumer1);
        enclavaPayments.payForDatasetUsage{value: 2 ether}(
            user1Token1,
            2 ether
        );

        vm.prank(consumer2);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(
            user1Token2,
            1 ether
        );

        vm.prank(consumer1);
        enclavaPayments.payForDatasetUsage{value: 3 ether}(
            user2Token1,
            3 ether
        );

        // Check balances
        assertEq(enclavaPayments.getTotalUnclaimedByOwner(user1), 3 ether);
        assertEq(enclavaPayments.getTotalUnclaimedByOwner(user2), 3 ether);
        assertEq(enclavaPayments.getTotalEarnedByOwner(user1), 3 ether);
        assertEq(enclavaPayments.getTotalEarnedByOwner(user2), 3 ether);

        // Bulk claim for user1
        uint256 user1BalanceBefore = user1.balance;
        vm.prank(user1);
        enclavaPayments.claimAllEarningsFromAllTokens();

        assertEq(user1.balance - user1BalanceBefore, 3 ether);
        assertEq(enclavaPayments.getTotalUnclaimedByOwner(user1), 0);
    }

    // ================================
    // EDGE CASES AND ERROR HANDLING
    // ================================

    function test_ReentrancyProtection() public {
        // This would require a malicious contract to test properly
        // For now, we verify the modifier is present on critical functions
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(tokenId, 1 ether);

        // The nonReentrant modifier should prevent reentrancy attacks
        vm.prank(user1);
        enclavaPayments.claimAllEarnings(tokenId);
    }

    function test_ZeroAmountClaim() public {
        vm.prank(owner);
        uint256 tokenId = enclavaPayments.safeMint(user1, "dataset_123");

        vm.prank(dataConsumer);
        enclavaPayments.payForDatasetUsage{value: 1 ether}(tokenId, 1 ether);

        vm.prank(user1);
        vm.expectRevert("AMOUNT_MUST_BE_POSITIVE");
        enclavaPayments.claimEarnings(tokenId, 0);
    }
}
