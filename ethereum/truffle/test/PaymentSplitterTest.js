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

    describe('DEPLOYMENT', function() {
        it('should be possible to deploy contract with valid params', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            let ownerOfContract = await paymentSplitter.owner.call();
            expect(ownerOfContract).equal(owner);
        });
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
        it('payment is splitted correctly', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            testPayoutForInitialRecipients(false);
        });
        it('update of all recipient conditions is working and payout still handled correctly', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            testPayoutForInitialRecipients(false);
            await paymentSplitter.updateRecipientConditions(fourRecipientsUpdated, validWeightsFourRecipients, {from: owner});
            testPayoutForUpdatedRecipients();
            console.log(paymentSplitter.address);
        });
        // TODO -> check why this fails
/*         it('update of single recipient is working and payout still handled correctly', async function () {
            await deployContract(threeRecipients, validWeightsThreeRecipients);
            console.log(paymentSplitter.address);
            testPayoutForInitialRecipients(false);
            let conditionId = await paymentSplitter.ownerToConditionIdMapping.call(recipient1);
            await paymentSplitter.updateRecipient(conditionId, singleUpdatedRecipient1, {from: owner});
            testPayoutForInitialRecipients(true);
        }); */
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
        //console.log(changeableRecipient);

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