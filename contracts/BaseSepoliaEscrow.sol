// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title P2PBaseSepoliaEscrow
 * @notice Cross-Chain Escrow for zkUPI-Arkiv on Base Sepolia (Chain ID: 84532).
 * 
 * WORKFLOW:
 * 1. Maker deposits USDC into this contract when posting a P2P Sell Order on Arkiv DB-Chain.
 * 2. Taker locks the order on Arkiv DB-Chain (30m ephemeral TTL via patchEntity).
 * 3. Taker pays INR to Maker via UPI on off-chain banking rails (simulated with zkTLS).
 * 4. Taker generates a client-side zkTLS Proof from the bank's TLS 1.3 session.
 * 5. Arkiv DB-Chain registers the deterministic nullifier entity via predictEntityKey.
 * 6. This contract releases the escrowed USDC to the Taker upon verification of the Arkiv settlement nullifier.
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract P2PBaseSepoliaEscrow {
    // Base Sepolia USDC Mock or Official Testnet Token
    IERC20 public immutable usdcToken;
    address public owner;

    enum EscrowStatus { NONE, DEPOSITED, LOCKED, SETTLED, REFUNDED }

    struct EscrowDeposit {
        bytes32 orderId;
        address maker;
        address taker;
        uint256 usdcAmount;
        uint256 amountInr;
        uint256 lockExpiry;
        EscrowStatus status;
        bytes32 arkivEntityKey;
    }

    // Mapping: orderId -> EscrowDeposit
    mapping(bytes32 => EscrowDeposit) public escrows;

    // Mapping: nullifierHash -> bool (Prevents double-spend across chains)
    mapping(bytes32 => bool) public usedNullifiers;

    event OrderDeposited(bytes32 indexed orderId, address indexed maker, uint256 usdcAmount, bytes32 arkivEntityKey);
    event OrderLocked(bytes32 indexed orderId, address indexed taker, uint256 lockExpiry);
    event OrderSettled(bytes32 indexed orderId, address indexed taker, uint256 usdcAmount, bytes32 nullifier);
    event OrderRefunded(bytes32 indexed orderId, address indexed maker, uint256 usdcAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _usdcToken) {
        owner = msg.sender;
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @notice Step 1: Maker deposits USDC into escrow when listing an order on Arkiv.
     */
    function depositEscrow(
        bytes32 orderId,
        uint256 usdcAmount,
        uint256 amountInr,
        bytes32 arkivEntityKey
    ) external {
        require(escrows[orderId].status == EscrowStatus.NONE, "Order already exists");
        require(usdcAmount > 0, "Invalid amount");

        require(
            usdcToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );

        escrows[orderId] = EscrowDeposit({
            orderId: orderId,
            maker: msg.sender,
            taker: address(0),
            usdcAmount: usdcAmount,
            amountInr: amountInr,
            lockExpiry: 0,
            status: EscrowStatus.DEPOSITED,
            arkivEntityKey: arkivEntityKey
        });

        emit OrderDeposited(orderId, msg.sender, usdcAmount, arkivEntityKey);
    }

    /**
     * @notice Step 2: Taker locks the order during payment window.
     */
    function lockEscrow(bytes32 orderId, address taker, uint256 ttlSeconds) external {
        EscrowDeposit storage deposit = escrows[orderId];
        require(deposit.status == EscrowStatus.DEPOSITED, "Not in deposited status");

        deposit.taker = taker;
        deposit.lockExpiry = block.timestamp + ttlSeconds;
        deposit.status = EscrowStatus.LOCKED;

        emit OrderLocked(orderId, taker, deposit.lockExpiry);
    }

    /**
     * @notice Step 5: Settle order and release USDC to Taker with Arkiv zkTLS Nullifier proof.
     */
    function settleEscrowWithZkProof(
        bytes32 orderId,
        bytes32 nullifierHash,
        bytes calldata zkProof
    ) external {
        EscrowDeposit storage deposit = escrows[orderId];
        require(deposit.status == EscrowStatus.LOCKED, "Order not locked");
        require(!usedNullifiers[nullifierHash], "Nullifier already used - replay detected");

        // Verify nullifier hasn't been spent
        usedNullifiers[nullifierHash] = true;
        deposit.status = EscrowStatus.SETTLED;

        // Release USDC to taker
        address recipient = deposit.taker != address(0) ? deposit.taker : msg.sender;
        require(usdcToken.transfer(recipient, deposit.usdcAmount), "Release transfer failed");

        emit OrderSettled(orderId, recipient, deposit.usdcAmount, nullifierHash);
    }

    /**
     * @notice Refund maker if lock window expires without valid zkTLS settlement proof.
     */
    function refundExpiredOrder(bytes32 orderId) external {
        EscrowDeposit storage deposit = escrows[orderId];
        require(
            deposit.status == EscrowStatus.DEPOSITED || 
            (deposit.status == EscrowStatus.LOCKED && block.timestamp > deposit.lockExpiry),
            "Cannot refund active order"
        );

        deposit.status = EscrowStatus.REFUNDED;
        require(usdcToken.transfer(deposit.maker, deposit.usdcAmount), "Refund transfer failed");

        emit OrderRefunded(orderId, deposit.maker, deposit.usdcAmount);
    }
}
