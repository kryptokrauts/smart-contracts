pragma solidity >=0.4.21 <0.6.0;

import "./SafeMath.sol";

contract PaymentSplitter {
  address public owner;

  struct RecipientCondition {
    address payable recipient;
    uint8 weight; // percentage to receive on payments (value between 1 and 100)
  }

  RecipientCondition[] public recipientConditions;
  mapping (uint => address) public conditionToOwnerMapping;

  event PaymentReceived(address sender, uint value);
  event SingleRecipientUpdated(address payable oldRecipient, address payable newRecipient);
  event AllRecipientsUpdated(address payable[] newRecipients, uint8[] newWeights);

  using SafeMath8 for uint8;

  constructor(address payable[] memory _recipients, uint8[] memory _weights) public validConditions(_recipients, _weights) {
    owner = msg.sender;
    for(uint i=0; i<_recipients.length; i++) {
      uint id = recipientConditions.push(RecipientCondition(_recipients[i], _weights[i])) - 1;
      conditionToOwnerMapping[id] = _recipients[i];
    }
    emit AllRecipientsUpdated(_recipients, _weights);
  }

  modifier isOwner() {
    require(msg.sender == owner, "sender must be owner");
    _;
  }

  modifier isOwnerOrRecipient(uint _conditionId) {
    require(msg.sender == owner || conditionToOwnerMapping[_conditionId] == msg.sender, "sender must be owner of contract or recipientcondition");
    _;
  }

  modifier validConditions(address payable[] memory _recipients, uint8[] memory _weights) {
    require(_recipients.length == _weights.length, "invalid amount of arguments");
    require(_recipients.length > 0, "list of recipients mustn't be empty");
    uint8 sum = 0;
    for(uint i=0; i<_weights.length; i++) {
      sum = sum.add(_weights[i]);
    }
    require(sum == 100);
    _;
  }

  // fallback function is used to proceed the payout to our recipients
  function() external payable {
    emit PaymentReceived(msg.sender, msg.value);
    for(uint i=0; i<recipientConditions.length; i++) {
      recipientConditions[i].recipient.transfer(msg.value / 100 * recipientConditions[i].weight);
    }
  }

  function updateRecipient(uint _conditionId, address payable _newRecipient) public isOwnerOrRecipient(_conditionId) {
    RecipientCondition storage recipientCondition = recipientConditions[_conditionId];
    recipientCondition.recipient = _newRecipient;
  }

  function updateRecipientConditions(address payable[] memory _recipients, uint8[] memory _weights) public isOwner validConditions(_recipients, _weights) {
    for(uint i=0; i<recipientConditions.length; i++) {
      delete(conditionToOwnerMapping[i]);
    }
    delete recipientConditions;
    for(uint i=0; i<_recipients.length; i++) {
      uint id = recipientConditions.push(RecipientCondition(_recipients[i], _weights[i])) - 1;
      conditionToOwnerMapping[id] = _recipients[i];
    }
    emit AllRecipientsUpdated(_recipients, _weights);
  }
}