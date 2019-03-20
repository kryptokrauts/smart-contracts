const PaymentSplitter = artifacts.require('./PaymentSplitter.sol');
const BN = require('bn.js');

contract("PaymentSplitter", accounts => {
    let owner = accounts[0];
    let recipient1 = accounts[1];
    let recipient2 = accounts[2];
    let recipient3 = accounts[3];

    let updatedRecipient1 = accounts[4];
    let updatedRecipient2 = accounts[5];
    let updatedRecipient3 = accounts[6];
    let updatedRecipient4 = accounts[7];

    let singleUpdatedRecipient1 = accounts[8];

    let threeRecipients = [recipient1, recipient2, recipient3];
    let threeRecipientsWithDuplicate = [recipient1, recipient2, recipient2]
    let fourRecipientsUpdated = [updatedRecipient1, updatedRecipient2, updatedRecipient3, updatedRecipient4];
    let validWeightsThreeRecipients = [10, 15, 75];
    let validWeightsFourRecipients = [20, 20, 20, 40];

    let emptyRecipients = [];
    let emptyWeights = [];
    let invalidWeights = [90, 10, 5];

    let paymentSplitter;

    async function deployContract(_recipients, _weights) {
        paymentSplitter = await PaymentSplitter.new(_recipients, _weights, { from: owner });
    }

    describe('DEPLOYMENT positive', function() {
        it('should be possible to deploy contract with valid params', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            let ownerOfContract = await paymentSplitter.owner.call();
            expect(ownerOfContract).equal(owner);
        });
    });

    describe('DEPLOYMENT negative', function() {
        it('should NOT be possible to deploy contract with invalid weights', async function () {
            try {
                await deployContract(threeRecipients, invalidWeights);
                assert.fail('should fail');
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
        it('should NOT be possible to deploy contract with empty list of recipients', async function () {
            try {
                await deployContract(emptyRecipients, emptyWeights);
                assert.fail('should fail');
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
        it('should NOT be possible to deploy contract if length of arrays differs', async function () {
            try {
                await deployContract(threeRecipients, validWeightsFourRecipients);
                assert.fail('should fail');
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
        it('should NOT be possible to deploy contract with duplicate address', async function () {
            try {
                await deployContract(threeRecipientsWithDuplicate, validWeightsThreeRecipients);
                assert.fail('should fail');
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
    });

    describe('FUNCTIONS positive', function() {
        it('should be possible to transfer ownership as owner', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            await paymentSplitter.transferOwnership(recipient1, {from: owner});
            let newOwner = await paymentSplitter.owner.call();
            expect(newOwner).equal(recipient1);
        });
        it('payment should be splitted correctly', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            await testPayoutForInitialRecipients(false);
        });
        it('payment should be splitted correctly after update of all recipient conditions', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            await testPayoutForInitialRecipients(false);
            await paymentSplitter.updateRecipientConditions(fourRecipientsUpdated, validWeightsFourRecipients, {from: owner});
            await testPayoutForUpdatedRecipients();
        });
        it('payment should be splitted correctly after update of single recipient', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            await testPayoutForInitialRecipients(false);
            let conditionId = await paymentSplitter.recipientToConditionIdMapping.call(recipient1);
            await paymentSplitter.updateRecipient(conditionId, singleUpdatedRecipient1, {from: owner});
            await testPayoutForInitialRecipients(true);
        });
        it('should be possible to update recipient from the recipients address', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            let conditionId = await paymentSplitter.recipientToConditionIdMapping.call(recipient1);
            await paymentSplitter.updateRecipient(conditionId, singleUpdatedRecipient1, {from: recipient1});
        });
    });

    describe('FUNCTIONS negative', function() {
        it('should NOT be possible to change owner from other address than owner', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            try {
                await paymentSplitter.transferOwnership(recipient1, {from: recipient1});
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
        it('should NOT be possible to update all recipient conditions from address other than owner', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            try {
                await paymentSplitter.updateRecipientConditions(fourRecipientsUpdated, validWeightsFourRecipients, {from: recipient1});
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
        it('should NOT be possible to update a recipient with an address that already exists', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            let conditionId = await paymentSplitter.recipientToConditionIdMapping.call(recipient1);
            try {
                await paymentSplitter.updateRecipient(conditionId, recipient2, {from: owner});
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
        it('should NOT be possible to update a recipient from an address other than recipient itself or owner', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            let conditionId = await paymentSplitter.recipientToConditionIdMapping.call(recipient1);
            try {
                await paymentSplitter.updateRecipient(conditionId, singleUpdatedRecipient1, {from: singleUpdatedRecipient1});
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
    });

    async function testPayoutForInitialRecipients(updated) {
        let amount = new BN(1);
        let etherValue = await web3.utils.toWei(amount, 'ether');

        let changeableRecipient;
        if(!updated) {
            changeableRecipient = recipient1;
        } else {
            changeableRecipient = singleUpdatedRecipient1;
        }

        let balanceRecipient1 = new BN(await web3.eth.getBalance(changeableRecipient));
        let balanceRecipient2 = new BN(await web3.eth.getBalance(recipient2));
        let balanceRecipient3 = new BN(await web3.eth.getBalance(recipient3));
        
        await web3.eth.sendTransaction({from: owner, to: paymentSplitter.address, value: etherValue });

        let newBalanceRecipient1 = new BN(await web3.eth.getBalance(changeableRecipient));
        let newBalanceRecipient2 = new BN(await web3.eth.getBalance(recipient2));
        let newBalanceRecipient3 = new BN(await web3.eth.getBalance(recipient3));

        let expectedPayout1 = etherValue.div(new BN(100)).mul(new BN(10));
        let expectedPayout2 = etherValue.div(new BN(100)).mul(new BN(15));
        let expectedPayout3 = etherValue.div(new BN(100)).mul(new BN(75));
        
        assert(balanceRecipient1.add(expectedPayout1).eq(newBalanceRecipient1));
        assert(balanceRecipient2.add(expectedPayout2).eq(newBalanceRecipient2));
        assert(balanceRecipient3.add(expectedPayout3).eq(newBalanceRecipient3));
    }

    async function testPayoutForUpdatedRecipients() {
        let amount = new BN(1);
        let etherValue = await web3.utils.toWei(amount, 'ether');

        let balanceRecipient1 = new BN(await web3.eth.getBalance(updatedRecipient1));
        let balanceRecipient2 = new BN(await web3.eth.getBalance(updatedRecipient2));
        let balanceRecipient3 = new BN(await web3.eth.getBalance(updatedRecipient3));
        let balanceRecipient4 = new BN(await web3.eth.getBalance(updatedRecipient4));
        
        await web3.eth.sendTransaction({from: owner, to: paymentSplitter.address, value: etherValue });

        let newBalanceRecipient1 = new BN(await web3.eth.getBalance(updatedRecipient1));
        let newBalanceRecipient2 = new BN(await web3.eth.getBalance(updatedRecipient2));
        let newBalanceRecipient3 = new BN(await web3.eth.getBalance(updatedRecipient3));
        let newBalanceRecipient4 = new BN(await web3.eth.getBalance(updatedRecipient4));

        let expectedPayout1 = etherValue.div(new BN(100)).mul(new BN(20));
        let expectedPayout2 = etherValue.div(new BN(100)).mul(new BN(20));
        let expectedPayout3 = etherValue.div(new BN(100)).mul(new BN(20));
        let expectedPayout4 = etherValue.div(new BN(100)).mul(new BN(40));
        
        assert(balanceRecipient1.add(expectedPayout1).eq(newBalanceRecipient1));
        assert(balanceRecipient2.add(expectedPayout2).eq(newBalanceRecipient2));
        assert(balanceRecipient3.add(expectedPayout3).eq(newBalanceRecipient3));
        assert(balanceRecipient4.add(expectedPayout4).eq(newBalanceRecipient4));
    }

    function assertInvalidOpCode(error) {
		assert(
			error.message.indexOf('VM Exception while processing transaction: revert') >= 0,
			'Method should have reverted'
		);
	}
})