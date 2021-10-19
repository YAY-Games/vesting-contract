// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// solhint-disable not-rely-on-time

contract YayVesting {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // category
    enum CategoryNames {EMPTY, VESTING}
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
    event TgeClaim(address indexed target, uint256 value, uint256 timestamp);
    event StepClaim(address indexed target, uint256 indexed step, uint256 value, uint256 timestamp);

    constructor(address _token, bytes32 _mercleRoot, uint256 _tgeTimestamp) public {
        require(_tgeTimestamp >= block.timestamp, "YayVesting: wrong timestamp");
        require(_token != address(0), "YayVesting: zero token address");
        require(_mercleRoot != bytes32(0), "YayVesting: zero mercle root");

        token = _token;
        mercleRoot = _mercleRoot;
        tgeTimestamp = _tgeTimestamp;

        // rounds settings
        categories[CategoryNames.VESTING] = CategoryType({
            totalSteps: 24,
            stepTime: 30 days,
            percentBefore: 4_00,
            percentAfter: 4_00
        });
    }

    function checkClaim(address _target, uint256 _category, uint256 _amount, bytes32[] calldata _merkleProof) external view returns(bool) {
        return (_verify(_target, _category, _amount, _merkleProof));
    }

    function claim(uint256 _category, uint256 _amount, bytes32[] calldata _merkleProof) external returns(uint256 _claimResult) {
        require(_verify(msg.sender, _category, _amount, _merkleProof), "YayVesting: Invalid proof or wrong data");
        require(CategoryNames(_category) != CategoryNames.EMPTY, "YayVesting: Invalid category");
        require(_amount > 0, "YayVesting: Invalid amount");
        require(block.timestamp >= tgeTimestamp, "YayVesting: TGE has not started yet");

        CategoryType memory category = categories[CategoryNames(_category)];

        uint256 reward = 0;

        // claim TGE reward
        if (tgeIsClaimed[msg.sender] == false) {
            reward = reward.add(_amount.mul(category.percentBefore).div(100_00));
            tgeIsClaimed[msg.sender] = true;

            emit TgeClaim(msg.sender, reward, block.timestamp);
        }

        // claim reward after TGE
        for (uint256 i = lastClaimedStep[msg.sender] + 1; i <= category.totalSteps; i++) {

            if (tgeTimestamp.add(category.stepTime.mul(i)) <= block.timestamp) {
                lastClaimedStep[msg.sender] = i;
                uint256 addedAmount = _amount.mul(category.percentAfter).div(100_00);
                reward = reward.add(addedAmount);

                emit StepClaim(msg.sender, i, addedAmount, block.timestamp);
            } else {
                break;
            }
        }

        require(reward > 0, "YayVesting: no tokens to claim");

        uint256 rewarded = alreadyRewarded[msg.sender];
        uint256 resultReward = 0;

        // if reward overlimit (security check)
        if (rewarded.add(reward) > _amount) {
            resultReward = _amount.sub(rewarded, "YayVesting: no tokens to claim (security check)");
        } else {
            resultReward = reward;
        }

        alreadyRewarded[msg.sender] = alreadyRewarded[msg.sender].add(resultReward);
        IERC20(token).safeTransfer(msg.sender, resultReward);

        emit Claim(msg.sender, _category, _amount, _merkleProof, resultReward, block.timestamp);

        return(resultReward);
    }

    function _verify(address _target, uint256 _category, uint256 _amount, bytes32[] memory _merkleProof) internal view returns(bool) {
        bytes32 node = keccak256(abi.encodePacked(_target, _category, _amount));
        return(MerkleProof.verify(_merkleProof, mercleRoot, node));
    }
}
