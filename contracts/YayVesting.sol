// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract YayVesting is Ownable {
    using SafeMath for uint256;

    enum CategoryNames {EMPTY, SEED, STRATEGIC, PRESALE, PUBLIC}
    struct InvestorTokens {
        address investor;
        CategoryNames category; 
        uint256 tokenAmount;
    }

    address public immutable token;
    uint256 public immutable tgeTimestamp;
    bool public inited = false;

    uint256 public totalInvestors;
    mapping(address => uint256) public investorBalance;
    mapping(address => CategoryNames) public investorCategory;
    
    constructor(address _token, uint256 _tgeTimestamp) public {
        require(_token != address(0));
        require(_tgeTimestamp >= block.timestamp);

        token = _token;
        tgeTimestamp = _tgeTimestamp;
    }

    function init(InvestorTokens[] calldata values) external onlyOwner {
        require(!inited);

        for (uint256 i = 0; i < values.length; i++) {
            if (investorBalance[values[i].investor] == 0) {
                investorBalance[values[i].investor] = values[i].tokenAmount;
                investorCategory[values[i].investor] = values[i].category;
                totalInvestors = totalInvestors.add(1);
            }
        }

    }

    function closeInit() external onlyOwner {
        require(!inited);
        inited = true;
    }

    function claim() external returns(uint256) {
        require(investorBalance[msg.sender] > 0);


    }
}