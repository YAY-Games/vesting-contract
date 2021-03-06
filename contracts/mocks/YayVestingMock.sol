// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "../YayVesting.sol";

contract YayVestingMock is YayVesting {
    constructor(
        address _token,
        bytes32 _mercleRoot,
        uint256 _tgeTimestamp,
        uint256 stepsTimeSeed,
        uint256 stepsTimeStrategic,
        uint256 stepsTimePresale,
        uint256 stepsTimePublic
    ) public YayVesting(_token, _mercleRoot, _tgeTimestamp) {
        categories[CategoryNames.SEED] = CategoryType({
            totalSteps: stepsTimeSeed,
            stepTime: 30 days,
            percentBefore: 0,
            percentAfter: 6_00
        });
        categories[CategoryNames.STRATEGIC] = CategoryType({
            totalSteps: stepsTimeStrategic,
            stepTime: 30 days,
            percentBefore: 0,
            percentAfter: 7_50
        });
        categories[CategoryNames.PRESALE] = CategoryType({
            totalSteps: stepsTimePresale,
            stepTime: 30 days,
            percentBefore: 0,
            percentAfter: 22_50
        });
        categories[CategoryNames.PUBLIC] = CategoryType({
            totalSteps: stepsTimePublic,
            stepTime: 7 days,
            percentBefore: 0,
            percentAfter: 10_00
        });
        categories[CategoryNames.V24MONTH] = CategoryType({
            totalSteps: stepsTimePublic,
            stepTime: 30 days,
            percentBefore: 0,
            percentAfter: 4_17
        });
    }
}