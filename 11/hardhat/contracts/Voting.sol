// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Voting {
    struct Proposal {
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        bool votingEnded;
        address creator;
        mapping(address => bool) hasVoted;
    }

    Proposal[] public proposals;
    uint256 public currentProposalId;

    event ProposalCreated(uint256 proposalId, string description, address creator);
    event VoteCast(uint256 proposalId, address voter, bool vote);
    event VotingEnded(uint256 proposalId, bool result);
    

    function createProposal(string memory _description) external {
        Proposal storage newProposal = proposals.push();
        newProposal.description = _description;
        newProposal.creator = msg.sender;
        newProposal.votingEnded = false;
        
        currentProposalId = proposals.length - 1;
        emit ProposalCreated(currentProposalId, _description, msg.sender);
    }

    function vote(uint256 _proposalId, bool _vote) external {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.votingEnded, "Voting has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        proposal.hasVoted[msg.sender] = true;
        if (_vote) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
        
        emit VoteCast(_proposalId, msg.sender, _vote);
    }

    function endVoting(uint256 _proposalId) external {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.creator, "Only creator can end voting");
        require(!proposal.votingEnded, "Voting already ended");
        
        proposal.votingEnded = true;
        bool result = proposal.yesVotes > proposal.noVotes;
        emit VotingEnded(_proposalId, result);
    }

    function getProposalResult(uint256 _proposalId) external view returns (string memory description, uint256 yes, uint256 no, bool ended, bool result) {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.description,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.votingEnded,
            proposal.yesVotes > proposal.noVotes
        );
    }

    function getCurrentProposalId() external view returns (uint256) {
        return currentProposalId;
    }
}