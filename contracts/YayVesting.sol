// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YayVesting is Ownable {
    using SafeMath for uint256;

    // category
    enum CategoryNames {EMPTY, SEED, STRATEGIC, PRESALE, PUBLIC}
    struct CategoryType {
        uint256 totalSteps;
        uint256 stepTime;       // unix format
        uint256 percentBefore;  // decimals = 2
        uint256 percentAfter;   // decimals = 2
    }
    mapping(CategoryNames => CategoryType) public categories;

    // investor
    struct InvestorTokens {
        address investor;
        CategoryNames category; 
        uint256 tokenAmount;
    }
    mapping(address => uint256) public alreadyRewarded;

    // contract settings
    address public immutable token;
    bytes32 public immutable mercleRoot;
    uint256 public immutable tgeTimestamp;

    // claim state
    mapping(address => bool) public tgeIsClaimed;
    mapping(address => uint256) public lastClaimedStep;

    event Claim(
        address indexed target,
        uint256 indexed category,
        uint256 amount,
        bytes32[] merkleProof,
        uint256 resultReward,
        uint256 timestamp
    );
    event TgeClaim(address indexed target, uint256 timestamp);
    event StepClaim(address indexed target, uint256 indexed step, uint256 timestamp);
    
    // solhint-disable not-rely-on-time
    constructor(address _token, bytes32 _mercleRoot, uint256 _tgeTimestamp) public {
        require(_token != address(0), "YayVesting: zero token address");
        require(_mercleRoot != bytes32(0), "YayVesting: zero mercle root");
        require(_tgeTimestamp >= block.timestamp, "YayVesting: wrong TGE timestamp");

        token = _token;
        mercleRoot = _mercleRoot;
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

    function emergencyWithdrawal(uint256 amount) external onlyOwner returns(bool) {
        require(amount > 0, "YayVesting: amount must be greater than 0");
        IERC20(token).transfer(msg.sender, amount);
        return true;
    }

    function checkClaim(address _target, uint256 _category, uint256 _amount, bytes32[] calldata _merkleProof) external view returns(bool) {
        return (verify(_target, _category, _amount, _merkleProof));
    }

    function claim(uint256 _category, uint256 _amount, bytes32[] calldata _merkleProof) external returns(uint256 _claimResult) {
        require(verify(msg.sender, _category, _amount, _merkleProof), "YayVesting: Invalid proof or wrong data");
        require(CategoryNames(_category) != CategoryNames.EMPTY, "YayVesting: Invalid category");
        require(_amount > 0, "YayVesting: Invalid amount");

        CategoryType memory category = categories[CategoryNames(_category)];

        require(block.timestamp >= tgeTimestamp, "YayVesting: TGE has not started yet");

        uint256 reward = 0;

        // claim TGE reward
        if (tgeIsClaimed[msg.sender] == false) {
            reward = reward.add(_amount.mul(category.percentBefore).div(100_00));
            tgeIsClaimed[msg.sender] = true;

            emit TgeClaim(msg.sender, block.timestamp);
        }

        // claim reward after TGE
        uint256 tgeTime = tgeTimestamp;
        for (uint256 i = lastClaimedStep[msg.sender]; i < category.totalSteps; i++) {

            if (tgeTime.add(category.stepTime.mul(i)) >= block.timestamp) {
                lastClaimedStep[msg.sender] = i.add(1);
                reward = reward.add(_amount.mul(category.percentAfter).div(100_00));

                emit StepClaim(msg.sender, i.add(1), block.timestamp);
            }
        }

        require(reward > 0, "YayVesting: no tokens to claim");

        uint256 rewarded = alreadyRewarded[msg.sender];
        uint256 resultReward = 0;

        // if reward overlimit (security check)
        if (rewarded.add(reward) > _amount) {
            resultReward = _amount.sub(rewarded);
        } else {
            resultReward = reward;
        }

        alreadyRewarded[msg.sender] = alreadyRewarded[msg.sender].add(resultReward);
        IERC20(token).transfer(msg.sender, resultReward);

        emit Claim(msg.sender, _category, _amount, _merkleProof, resultReward, block.timestamp);

        return(resultReward);
    }

    function verify(address _target, uint256 _category, uint256 _amount, bytes32[] memory _merkleProof) internal view returns(bool) {
        bytes32 node = keccak256(abi.encodePacked(_target, _category, _amount));
        return(MerkleProof.verify(_merkleProof, mercleRoot, node));
    }
}