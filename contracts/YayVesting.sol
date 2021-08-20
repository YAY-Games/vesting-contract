// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract YayVesting is Ownable {
    using SafeMath for uint256;

    // Category
    enum CategoryNames {EMPTY, SEED, STRATEGIC, PRESALE, PUBLIC}
    struct CategoryType {
        uint256 totalSteps;
        uint256 stepTime;       // unix format
        uint256 percentBefore;  // decimals = 2
        uint256 percentAfter;   // decimals = 2
    }
    mapping(CategoryNames => CategoryType) public categories;

    // Investor
    struct InvestorTokens {
        address investor;
        CategoryNames category; 
        uint256 tokenAmount;
    }
    uint256 public totalInvestors;
    mapping(address => uint256) public investorBalance;
    mapping(address => uint256) public rewardedToInvestor;
    mapping(address => CategoryNames) public investorCategory;

    // Contract settings
    address public immutable token;
    uint256 public immutable tgeTimestamp;
    bool public inited = false;

    // Claim state
    mapping(address => bool) public tgeIsClaimed;
    mapping(address => uint256) public lastClaimedStep;
    
    // solhint-disable not-rely-on-time
    constructor(address _token, uint256 _tgeTimestamp) public {
        require(_token != address(0));
        require(_tgeTimestamp >= block.timestamp);

        token = _token;
        tgeTimestamp = _tgeTimestamp;

        // rounds settings
        categories[CategoryNames.SEED] = CategoryType({
            totalSteps: 15,
            stepTime: 30 days,
            percentBefore: 10_00,
            percentAfter: 6_00  // 6.00% * 15 + 10.00% = 100.00%
        });
        categories[CategoryNames.STRATEGIC] = CategoryType({
            totalSteps: 12,
            stepTime: 30 days,
            percentBefore: 10_00,
            percentAfter: 7_50  // 7.50% * 12 + 10.00% = 100.00%
        });
        categories[CategoryNames.PRESALE] = CategoryType({
            totalSteps: 5,
            stepTime: 30 days,
            percentBefore: 30_00,
            percentAfter: 14_00  // 14.00% * 5 + 30.00% = 100.00%
        });
        categories[CategoryNames.PUBLIC] = CategoryType({
            totalSteps: 8,
            stepTime: 7 days,
            percentBefore: 30_00,
            percentAfter: 8_75  // 8.75% * 8 + 30.00% = 100.00%
        });
    }

    function init(InvestorTokens[] calldata values) external onlyOwner returns(bool) {
        require(!inited, "YayVesting: already initiated");

        for (uint256 i = 0; i < values.length; i++) {
            require(investorBalance[values[i].investor] == 0);
            require(values[i].category != CategoryNames.EMPTY);
            require(values[i].tokenAmount != 0);

            investorBalance[values[i].investor] = values[i].tokenAmount;
            investorCategory[values[i].investor] = values[i].category;
            totalInvestors = totalInvestors.add(1);
        }
        return true;
    }

    function closeInit() external onlyOwner returns(bool) {
        require(!inited, "YayVesting: already initiated");
        inited = true;
        return true;
    }

    function emergencyWithdrawal(uint256 amount) external onlyOwner returns(bool) {
        require(amount > 0, "YayVesting: amount must be greater than 0");
        IERC20(token).transfer(msg.sender, amount);
        return true;
    }

    function claim() external returns(uint256 totalReward) {
        require(inited, "YayVesting: claimable not allowed yet");
        require(investorBalance[msg.sender] > 0, "YayVesting: you are not investor");

        CategoryType memory category = categories[investorCategory[msg.sender]];

        require(block.timestamp >= tgeTimestamp, "YayVesting: TGE has not started yet");

        uint256 reward = 0;
        uint256 balance = investorBalance[msg.sender];

        if (tgeIsClaimed[msg.sender] == false) {
            reward = reward.add(balance.mul(category.percentBefore).div(100_00));
            tgeIsClaimed[msg.sender] = true;
        }

        uint256 tgeTime = tgeTimestamp;
        for (uint256 i = lastClaimedStep[msg.sender]; i < category.totalSteps; i++) {

            if (tgeTime.add(category.stepTime.mul(i)) >= block.timestamp) {
                lastClaimedStep[msg.sender] = i.add(1);
                reward = reward.add(balance.mul(category.percentAfter).div(100_00));
            }
        }

        require(reward > 0, "YayVesting: no tokens to claim");

        uint256 rewarded = rewardedToInvestor[msg.sender];
        uint256 needToReward = 0;

        // if overlimit (security check)
        if (rewarded.add(reward) > balance) {
            needToReward = balance.sub(rewarded);
        } else {
            needToReward = reward;
        }

        rewardedToInvestor[msg.sender] = rewardedToInvestor[msg.sender].add(needToReward);
        IERC20(token).transfer(msg.sender, needToReward);

        return(needToReward);
    }
}