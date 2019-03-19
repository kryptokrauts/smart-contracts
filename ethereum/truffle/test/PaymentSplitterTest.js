var PaymentSplitter = artifacts.require('./PaymentSplitter.sol');

// require('truffle-test-utils').init();

contract("PaymentSplitter", accounts => {
    let owner = accounts[0];
    let recipient1 = accounts[1];
    let recipient2 = accounts[2];
    let recipient3 = accounts[3];

    let recipients = [recipient1, recipient2, recipient3];
    let validWeights = [10, 15, 75];
    let validWeightsInvalidLength = [20, 20, 20, 40];

    let emptyRecipients = [];
    let emptyWeights = [];
    let invalidWeights = [90, 10, 5];

    let paymentSplitter;

    async function deployContract(_recipients, _weights) {
        paymentSplitter = await PaymentSplitter.new(_recipients, _weights, { from: owner });
    }

    describe('DEPLOYMENT', function() {
        it('should be possible to deploy contract with valid params', async function () {
            await deployContract(recipients, validWeights);
            let ownerOfContract = await paymentSplitter.owner.call();
            expect(ownerOfContract).equal(owner);
        });
        it('should NOT be possible to deploy contract with invalid weights', async function () {
            try {
                await deployContract(recipients, invalidWeights);
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
                await deployContract(recipients, validWeightsInvalidLength);
                assert.fail('should fail');
            } catch(error) {
                assertInvalidOpCode(error);
            }
        });
    });

    function assertInvalidOpCode(error) {
		assert(
			error.message.indexOf('VM Exception while processing transaction: revert') >= 0,
			'Method should have reverted'
		);
	}
})