// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

contract ChainlinkOracle is Ownable {
    AggregatorV3Interface public immutable priceFeed;

    uint256 public immutable stalenessPeriod;

    error StalePrice();
    error InvalidPrice();

    constructor(address _priceFeedAddress, uint256 _stalenessPeriod) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        stalenessPeriod = _stalenessPeriod;
    }

    function getLatestPrice() external view returns (uint256) {
        (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            priceFeed.latestRoundData();

        if (startedAt == 0) revert InvalidPrice();

        if (price <= 0) revert InvalidPrice();

        if (block.timestamp - updatedAt > stalenessPeriod) revert StalePrice();

        if (answeredInRound < roundId) revert StalePrice();

        return uint256(price);
    }
}
