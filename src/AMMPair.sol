// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
/* solhint-disable use-natspec const-name-snakecase immutable-vars-naming gas-indexed-events gas-custom-errors import-path-check */

import {IERC20} from "./IERC20.sol";
import {ReentrancyGuard} from "./AMMUpgradeHelpers.sol";

/// @title AMM Pair
/// @author anonymous
/// @notice Liquidity pair contract for token swaps and LP token minting and burning.
contract AMMPair is ReentrancyGuard {
    /// @notice First token in the pair, sorted by address.
    address public immutable token0;
    /// @notice Second token in the pair, sorted by address.
    address public immutable token1;
    /// @notice Factory contract that deployed this pair.
    address public immutable factory;
    /// @notice Total LP token supply.
    uint256 public totalSupply;
    /// @notice LP token balances by account.
    mapping(address => uint256) public balanceOf;
    /// @notice LP token allowances by owner and spender.
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 private reserve0;
    uint256 private reserve1;

    /// @notice ERC20 token name for this pair.
    string public constant name = "DeFi Super-App LP Token";
    /// @notice ERC20 token symbol for this pair.
    string public constant symbol = "DSL";
    /// @notice ERC20 token decimals for this pair.
    uint8 public constant decimals = 18;
    /// @notice Minimum liquidity that remains locked in the pair.
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;

    /// @notice Emitted when an allowance is approved.
    /// @param owner The owner of the tokens.
    /// @param spender The spender of the tokens.
    /// @param value The amount approved.
    event Approval(address indexed owner, address indexed spender, uint256 indexed value);
    /// @notice Emitted when tokens are transferred.
    /// @param from The sender.
    /// @param to The recipient.
    /// @param value The amount transferred.
    event Transfer(address indexed from, address indexed to, uint256 indexed value);
    /// @notice Emitted when liquidity is minted.
    /// @param sender The sender.
    /// @param amount0 The amount of token0 added.
    /// @param amount1 The amount of token1 added.
    event Mint(address indexed sender, uint256 indexed amount0, uint256 indexed amount1);
    /// @notice Emitted when liquidity is burned.
    /// @param sender The sender.
    /// @param to The recipient.
    /// @param amount0 The amount of token0 removed.
    /// @param amount1 The amount of token1 removed.
    event Burn(address indexed sender, address indexed to, uint256 amount0, uint256 amount1);
    /// @notice Emitted when a swap occurs.
    /// @param sender The sender.
    /// @param amount0In The amount of token0 input.
    /// @param amount1In The amount of token1 input.
    /// @param amount0Out The amount of token0 output.
    /// @param amount1Out The amount of token1 output.
    /// @param to The recipient.
    event Swap(
        address indexed sender,
        uint256 indexed amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    /// @notice Emitted when reserves are synced.
    /// @param reserve0 The new reserve0.
    /// @param reserve1 The new reserve1.
    event Sync(uint256 indexed reserve0, uint256 indexed reserve1);

    constructor(address _token0, address _token1, address _factory) {
        require(_token0 != _token1, "AMMPair: IDENTICAL_ADDRESSES");
        require(_token0 != address(0) && _token1 != address(0), "AMMPair: ZERO_ADDRESS");
        require(_factory != address(0), "AMMPair: ZERO_ADDRESS");
        token0 = _token0;
        token1 = _token1;
        factory = _factory;
    }

    /// @notice Approves a spender to spend tokens.
    /// @param spender The spender address.
    /// @param value The amount to approve.
    /// @return True if successful.
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /// @notice Transfers tokens to a recipient.
    /// @param to The recipient address.
    /// @param value The amount to transfer.
    /// @return True if successful.
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    /// @notice Transfers tokens from one address to another.
    /// @param from The sender address.
    /// @param to The recipient address.
    /// @param value The amount to transfer.
    /// @return True if successful.
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(value <= allowed, "AMMPair: EXCEEDS_ALLOWANCE");
        allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    /// @notice Returns the current reserves.
    /// @return reserve0 The reserve of token0.
    /// @return reserve1 The reserve of token1.
    function getReserves() public view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    /// @notice Adds liquidity to the pair.
    /// @param amount0 The amount of token0 to add.
    /// @param amount1 The amount of token1 to add.
    /// @param to The recipient of the liquidity tokens.
    /// @return liquidity The amount of liquidity tokens minted.
    function addLiquidity(uint256 amount0, uint256 amount1, address to)
        external
        nonReentrant
        returns (uint256 liquidity)
    {
        require(amount0 > 0 && amount1 > 0, "AMMPair: INSUFFICIENT_AMOUNT");

        require(IERC20(token0).transferFrom(msg.sender, address(this), amount0), "AMMPair: TRANSFER_FAILED");
        require(IERC20(token1).transferFrom(msg.sender, address(this), amount1), "AMMPair: TRANSFER_FAILED");

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0Added = balance0 - reserve0;
        uint256 amount1Added = balance1 - reserve1;

        if (totalSupply < MINIMUM_LIQUIDITY) {
            uint256 root = sqrt(amount0Added * amount1Added);
            liquidity = root - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            uint256 liquidity0 = (amount0Added * totalSupply) / reserve0;
            uint256 liquidity1 = (amount1Added * totalSupply) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }

        require(liquidity > 0, "AMMPair: INSUFFICIENT_LIQUIDITY");
        _mint(to, liquidity);
        _update(balance0, balance1);

        emit Mint(msg.sender, amount0Added, amount1Added);
    }

    /// @notice Removes liquidity from the pair.
    /// @param liquidity The amount of liquidity tokens to burn.
    /// @param to The recipient of the tokens.
    /// @return amount0 The amount of token0 returned.
    /// @return amount1 The amount of token1 returned.
    function removeLiquidity(uint256 liquidity, address to)
        external
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        require(liquidity > 0, "AMMPair: INSUFFICIENT_LIQUIDITY");

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        amount0 = (liquidity * balance0) / totalSupply;
        amount1 = (liquidity * balance1) / totalSupply;

        require(amount0 > 0 && amount1 > 0, "AMMPair: INSUFFICIENT_LIQUIDITY");
        _burn(msg.sender, liquidity);

        require(IERC20(token0).transfer(to, amount0), "AMMPair: TRANSFER_FAILED");
        require(IERC20(token1).transfer(to, amount1), "AMMPair: TRANSFER_FAILED");

        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));

        _update(balance0, balance1);
        emit Burn(msg.sender, to, amount0, amount1);
    }

    /// @notice Swaps tokens.
    /// @param amount0Out The amount of token0 to output.
    /// @param amount1Out The amount of token1 to output.
    /// @param to The recipient.
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "AMMPair: INSUFFICIENT_OUTPUT");
        require(to != address(0), "AMMPair: INVALID_TO");

        uint256 _reserve0 = reserve0;
        uint256 _reserve1 = reserve1;
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "AMMPair: INSUFFICIENT_LIQUIDITY");

        if (amount0Out > 0) {
            require(IERC20(token0).transfer(to, amount0Out), "AMMPair: TRANSFER_FAILED");
        }
        if (amount1Out > 0) {
            require(IERC20(token1).transfer(to, amount1Out), "AMMPair: TRANSFER_FAILED");
        }

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "AMMPair: INSUFFICIENT_INPUT");

        unchecked {
            uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            require(balance0Adjusted * balance1Adjusted >= _reserve0 * _reserve1 * (1000 ** 2), "AMMPair: K");
        }

        _update(balance0, balance1);

        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /// @notice Quotes the output amount for a given input.
    /// @param amountA The input amount.
    /// @param reserveA The reserve of the input token.
    /// @param reserveB The reserve of the output token.
    /// @return The output amount.
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256) {
        require(amountA > 0, "AMMPair: INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "AMMPair: INSUFFICIENT_LIQUIDITY");
        return (amountA * reserveB) / reserveA;
    }

    /// @notice Calculates the output amount for a swap given an input amount and reserves.
    /// @param amountIn The input amount.
    /// @param reserveIn The reserve of the input token.
    /// @param reserveOut The reserve of the output token.
    /// @return amountOut The calculated output amount after a 0.3% fee.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        require(amountIn > 0, "AMMPair: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "AMMPair: INSUFFICIENT_LIQUIDITY");
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Force balances to match reserves
    function skim(address to) external nonReentrant {
        address _token0 = token0;
        address _token1 = token1;
        require(IERC20(_token0).transfer(to, IERC20(_token0).balanceOf(address(this)) - reserve0), "AMMPair: TF");
        require(IERC20(_token1).transfer(to, IERC20(_token1).balanceOf(address(this)) - reserve1), "AMMPair: TF");
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "AMMPair: TRANSFER_FROM_ZERO");
        require(to != address(0), "AMMPair: TRANSFER_TO_ZERO");

        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "AMMPair: EXCEEDS_BALANCE");
        balanceOf[from] = fromBalance - amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 value) private {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) private {
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= value, "AMMPair: BURN_EXCESSIVE");
        balanceOf[from] = fromBalance - value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _update(uint256 balance0_, uint256 balance1_) private {
        reserve0 = balance0_;
        reserve1 = balance1_;
        emit Sync(balance0_, balance1_);
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        assembly {
            z := 1
            if gt(y, 3) {
                z := y
                let x := add(div(y, 2), 1)
                for {} lt(x, z) {} {
                    z := x
                    x := div(add(div(y, x), x), 2)
                }
            }
            if iszero(y) { z := 0 }
        }
    }
}
