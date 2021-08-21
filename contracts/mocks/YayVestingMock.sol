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
    ) YayVesting(_token, _mercleRoot, _tgeTimestamp) public {
        // rounds settings
        categories[CategoryNames.SEED] = CategoryType({
            totalSteps: stepsTimeSeed,
            stepTime: 30 days,
            percentBefore: 10_00,
            percentAfter: 6_00  // 6.00% * 15 + 10.00% = 100.00%
        });
        categories[CategoryNames.STRATEGIC] = CategoryType({
            totalSteps: stepsTimeStrategic,
            stepTime: 30 days,
            percentBefore: 10_00,
            percentAfter: 7_50  // 7.50% * 12 + 10.00% = 100.00%
        });
        categories[CategoryNames.PRESALE] = CategoryType({
            totalSteps: stepsTimePresale,
            stepTime: 30 days,
            percentBefore: 30_00,
            percentAfter: 14_00  // 14.00% * 5 + 30.00% = 100.00%
        });
        categories[CategoryNames.PUBLIC] = CategoryType({
            totalSteps: stepsTimePublic,
            stepTime: 7 days,
            percentBefore: 30_00,
            percentAfter: 8_75  // 8.75% * 8 + 30.00% = 100.00%
        });
    }
}