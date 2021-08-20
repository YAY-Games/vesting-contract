// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "../YayVesting.sol";

contract YayVestingMock is YayVesting {
    constructor(
        address _token,
        uint256 _tgeTimestamp,
        uint256 stepTimeSeed,
        uint256 stepTimeStrategic,
        uint256 stepTimePresale,
        uint256 stepTimePublic
    ) YayVesting(_token, _tgeTimestamp) public {
        categories[CategoryNames.SEED] = CategoryType({
            totalSteps: 15,
            stepTime: stepTimeSeed,
            percentBefore: 10_00,
            percentAfter: 6_00
        });
        categories[CategoryNames.STRATEGIC] = CategoryType({
            totalSteps: 12,
            stepTime: stepTimeStrategic,
            percentBefore: 10_00,
            percentAfter: 7_50
        });
        categories[CategoryNames.PRESALE] = CategoryType({
            totalSteps: 5,
            stepTime: stepTimePresale,
            percentBefore: 30_00,
            percentAfter: 14_00
        });
        categories[CategoryNames.PUBLIC] = CategoryType({
            totalSteps: 8,
            stepTime: stepTimePublic,
            percentBefore: 30_00,
            percentAfter: 8_75
        });
    }
}