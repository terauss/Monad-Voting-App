// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HappyVote {
    uint256 public happyVotes;
    uint256 public sadVotes;

    mapping(address => uint256) public lastVotedAt;

    event Voted(address indexed user, bool isHappy);

    function vote(bool isHappy) external {
        require(
            block.timestamp - lastVotedAt[msg.sender] >= 1 days,
            "You can only vote once every 24 hours"
        );

        lastVotedAt[msg.sender] = block.timestamp;

        if (isHappy) {
            happyVotes += 1;
        } else {
            sadVotes += 1;
        }

        emit Voted(msg.sender, isHappy);
    }

    function getVotes() external view returns (uint256 happy, uint256 sad) {
        return (happyVotes, sadVotes);
    }

    function canVote(address user) external view returns (bool) {
        return block.timestamp - lastVotedAt[user] >= 1 days;
    }

    function timeUntilNextVote(address user) external view returns (uint256) {
        uint256 lastTime = lastVotedAt[user];
        if (block.timestamp - lastTime >= 1 days) {
            return 0;
        } else {
            return (1 days) - (block.timestamp - lastTime);
        }
    }
}
