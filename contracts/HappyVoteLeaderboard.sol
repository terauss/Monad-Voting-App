// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HappyVoteLeaderboardTopN {
    uint256 public constant COOLDOWN = 1 days;

    uint256 public happyVotes;
    uint256 public sadVotes;

    mapping(address => uint256) public lastVotedAt;
    mapping(address => uint256) public happyVoteCount;

    address[] private leaderboard;
    mapping(address => uint256) private indexOf;
    uint256 public topN;

    address public owner;

    event Voted(address indexed user, bool isHappy);
    event LeaderboardUpdated(address indexed by, address indexed account, uint256 newCount);
    event LeaderboardMemberRemoved(address indexed account);
    event LeaderboardCleared();
    event TopNChanged(uint256 oldTopN, uint256 newTopN);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _topN) {
        require(_topN > 0, "topN must be > 0");
        topN = _topN;
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        address old = owner;
        owner = newOwner;
        emit OwnerTransferred(old, newOwner);
    }

    function vote(bool isHappy) external {
        require(
            block.timestamp - lastVotedAt[msg.sender] >= COOLDOWN,
            "You can only vote once every 24 hours"
        );

        lastVotedAt[msg.sender] = block.timestamp;

        if (isHappy) {
            happyVotes += 1;
            happyVoteCount[msg.sender] += 1;
            _updateLeaderboardOnHappyVote(msg.sender);
        } else {
            sadVotes += 1;
        }

        emit Voted(msg.sender, isHappy);
    }

    function getVotes() external view returns (uint256 happy, uint256 sad) {
        return (happyVotes, sadVotes);
    }

    function canVote(address user) external view returns (bool) {
        return block.timestamp - lastVotedAt[user] >= COOLDOWN;
    }

    function timeUntilNextVote(address user) external view returns (uint256) {
        uint256 lastTime = lastVotedAt[user];
        if (block.timestamp - lastTime >= COOLDOWN) {
            return 0;
        }
        return COOLDOWN - (block.timestamp - lastTime);
    }

    function getHappyLeaderboard()
        external
        view
        returns (address[] memory addresses, uint256[] memory counts)
    {
        uint256 len = leaderboard.length;
        addresses = new address[](len);
        counts = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            addresses[i] = leaderboard[i];
            counts[i] = happyVoteCount[leaderboard[i]];
        }
    }

    function _updateLeaderboardOnHappyVote(address voter) internal {
        uint256 voterCount = happyVoteCount[voter];
        uint256 currentIndex = indexOf[voter];

        if (currentIndex > 0) {
            uint256 idx = currentIndex - 1;
            while (idx > 0) {
                address prevAddr = leaderboard[idx - 1];
                if (voterCount <= happyVoteCount[prevAddr]) break;
                leaderboard[idx - 1] = voter;
                leaderboard[idx] = prevAddr;
                indexOf[voter] = idx;
                indexOf[prevAddr] = idx + 1;
                idx--;
            }
            emit LeaderboardUpdated(msg.sender, voter, voterCount);
            return;
        }

        if (leaderboard.length < topN) {
            leaderboard.push(voter);
            indexOf[voter] = leaderboard.length;
            uint256 idx = leaderboard.length - 1;
            while (idx > 0) {
                address prevAddr = leaderboard[idx - 1];
                if (voterCount <= happyVoteCount[prevAddr]) break;
                leaderboard[idx - 1] = voter;
                leaderboard[idx] = prevAddr;
                indexOf[voter] = idx;
                indexOf[prevAddr] = idx + 1;
                idx--;
            }
            emit LeaderboardUpdated(msg.sender, voter, voterCount);
            return;
        }

        uint256 lastIndex = leaderboard.length - 1;
        address lastAddr = leaderboard[lastIndex];
        uint256 lastCount = happyVoteCount[lastAddr];

        if (voterCount <= lastCount) {
            return;
        }

        indexOf[lastAddr] = 0;
        leaderboard[lastIndex] = voter;
        indexOf[voter] = lastIndex + 1;

        uint256 idx2 = lastIndex;
        while (idx2 > 0) {
            address prevAddr = leaderboard[idx2 - 1];
            if (voterCount <= happyVoteCount[prevAddr]) break;
            leaderboard[idx2 - 1] = voter;
            leaderboard[idx2] = prevAddr;
            indexOf[voter] = idx2;
            indexOf[prevAddr] = idx2 + 1;
            idx2--;
        }

        emit LeaderboardUpdated(msg.sender, voter, voterCount);
    }

    function removeMember(address account) external onlyOwner {
        uint256 idx1 = indexOf[account];
        require(idx1 > 0, "not in leaderboard");
        uint256 idx = idx1 - 1;
        uint256 len = leaderboard.length;

        for (uint256 i = idx; i + 1 < len; i++) {
            leaderboard[i] = leaderboard[i + 1];
            indexOf[leaderboard[i]] = i + 1;
        }
        leaderboard.pop();
        indexOf[account] = 0;
        emit LeaderboardMemberRemoved(account);
    }

    function clearLeaderboard() external onlyOwner {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            indexOf[leaderboard[i]] = 0;
        }
        delete leaderboard;
        emit LeaderboardCleared();
    }

    function setTopN(uint256 newTopN) external onlyOwner {
        require(newTopN > 0, "topN must be > 0");
        uint256 old = topN;
        if (newTopN == old) return;
        topN = newTopN;

        if (leaderboard.length > newTopN) {
            for (uint256 i = newTopN; i < leaderboard.length; i++) {
                indexOf[leaderboard[i]] = 0;
            }
            while (leaderboard.length > newTopN) {
                leaderboard.pop();
            }
        }
        emit TopNChanged(old, newTopN);
    }

    function getIndexOf(address account) external view returns (uint256) {
        return indexOf[account];
    }

    function getLeaderboardAddresses() external view returns (address[] memory) {
        return leaderboard;
    }
}
