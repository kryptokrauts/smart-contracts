const Ae = require('@aeternity/aepp-sdk').Universal;
const Crypto = require('@aeternity/aepp-sdk').Crypto;
const BigNumber = require('bignumber.js');

const config = {
    host: "http://localhost:3001/",
    internalHost: "http://localhost:3001/internal/",
    compilerUrl: "https://compiler.aepps.com"
};

const paymentSplitterFunctions = require('./constants/paymentSplitterFunctions');

describe('PaymentSplitter Contract', () => {

    let contractSource = utils.readFileRelative('./contracts/PaymentSplitter.aes', 'utf-8');
    let contractClientOwner, contractClientRecipientOne, contractClientNonRecipient;
    let clientOwner, clientRecipientOne, clientRecipientTwo, clientRecipientThree, clientNonRecipient;
    let ownerKeyPair = wallets[0];
    let recipientOneKeyPair = wallets[1];
    let recipientTwoKeyPair = wallets[2];
    let recipientThreeKeyPair = wallets[3];
    let recipientFourKeyPair = wallets[4]
    let recipientFiveKeyPair = wallets[5]
    let recipientSixKeyPair = wallets[6]
    let nonRecipientKeyPair = wallets[7];
    let recipientConditions = new Map();

    before(async () => {
        clientOwner = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: ownerKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        clientRecipientOne = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: recipientOneKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        clientRecipientTwo = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: recipientTwoKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        clientRecipientThree = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: recipientThreeKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        clientNonRecipient = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            compilerUrl: config.compilerUrl,
            keypair: nonRecipientKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });
    });

    describe('Deploy contract', async () => {
        it('FAILURE deploy and initialize with weight sum other than 100', async () => {
            recipientConditions.set(recipientOneKeyPair.publicKey, 35);
            recipientConditions.set(recipientTwoKeyPair.publicKey, 40);
            recipientConditions.set(recipientThreeKeyPair.publicKey, 5);
    
            const contractClientFailDeploy = await clientOwner.getContractInstance(contractSource);
            const deploy = await contractClientFailDeploy.deploy([recipientConditions]).catch(x => x);
    
            assert.equal(deploy.returnType, 'revert', 'Deploy the PaymentSplitter Smart Contract did not revert');
        });

        it('SUCCESS deploy and initialize', async () => {
            recipientConditions.set(recipientOneKeyPair.publicKey, 35);
            recipientConditions.set(recipientTwoKeyPair.publicKey, 40);
            recipientConditions.set(recipientThreeKeyPair.publicKey, 25);
    
            contractClientOwner = await clientOwner.getContractInstance(contractSource);
    
            const deploy = await contractClientOwner.deploy([recipientConditions]);
    
            assert.equal(deploy.deployInfo.result.returnType, 'ok', 'Could not deploy the PaymentSplitter Smart Contract');

            // initialize contractClient with other accounts
            contractClientRecipientOne = await clientRecipientOne.getContractInstance(contractSource, {contractAddress: deploy.deployInfo.address});
            contractClientNonRecipient = await clientNonRecipient.getContractInstance(contractSource, {contractAddress: deploy.deployInfo.address});
        });
    });

    describe('Interact with contract', async () => {
        it('should have the correct initial state', async () => {
            // owner
            const ownerResult = await contractClientOwner.call(paymentSplitterFunctions.GET_OWNER, [], {callStatic: true});
            const decodedOwnerResult = await ownerResult.decode();
            assert.equal(decodedOwnerResult, ownerKeyPair.publicKey);

            // weights
            const expectedWeightRecipientOne = 35;
            const expectedWeightRecipientTwo = 40;
            const expectedWeightRecipientThree = 25;
            const weightRecipientOneResult = await contractClientOwner.call(paymentSplitterFunctions.GET_WEIGHT, [recipientOneKeyPair.publicKey], {callStatic: true});
            const weightRecipientTwoResult = await contractClientOwner.call(paymentSplitterFunctions.GET_WEIGHT, [recipientTwoKeyPair.publicKey], {callStatic: true});
            const weightRecipientThreeResult = await contractClientOwner.call(paymentSplitterFunctions.GET_WEIGHT, [recipientThreeKeyPair.publicKey], {callStatic: true});
            const decodedWeightRecipientOneResult = await weightRecipientOneResult.decode();
            const decodedWeightRecipientTwoResult = await weightRecipientTwoResult.decode();
            const decodedWeightRecipientThreeResult = await weightRecipientThreeResult.decode();
            assert.equal(decodedWeightRecipientOneResult, expectedWeightRecipientOne);
            assert.equal(decodedWeightRecipientTwoResult, expectedWeightRecipientTwo);
            assert.equal(decodedWeightRecipientThreeResult, expectedWeightRecipientThree);

            // size
            const expectedRecipientsCount = 3;
            const countResult = await contractClientOwner.call(paymentSplitterFunctions.GET_RECIPIENTS_COUNT, [], {callStatic: true});
            const decodedCountResult = await countResult.decode();
            assert.equal(decodedCountResult, expectedRecipientsCount);

            // is recipient true
            let isRecipientResult = await contractClientOwner.call(paymentSplitterFunctions.IS_RECIPIENT, [recipientOneKeyPair.publicKey], {callStatic: true});
            let decodedIsRecipientResult = await isRecipientResult.decode();
            assert.isTrue(decodedIsRecipientResult);

            // is recipient false
            isRecipientResult = await contractClientOwner.call(paymentSplitterFunctions.IS_RECIPIENT, [nonRecipientKeyPair.publicKey], {callStatic: true});
            decodedIsRecipientResult = await isRecipientResult.decode();
            assert.isFalse(decodedIsRecipientResult);
        });

        it('should split payment correctly when contract balance is 0', async () => {
            const recipientOneBalanceInitial = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceInitial = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceInitial = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            // check if contract balance is 0
            const contractBalanceInitial = new BigNumber(await clientOwner.balance(contractClientOwner.deployInfo.address));
            assert.equal(contractBalanceInitial, 0)

            const aettos = new BigNumber(2000);
            const expectedPayout1 = aettos.dividedBy(100).multipliedBy(35);
            const expectedPayout2 = aettos.dividedBy(100).multipliedBy(40);
            const expectedPayout3 = aettos.dividedBy(100).multipliedBy(25);

            await contractClientNonRecipient.call(paymentSplitterFunctions.PAY_AND_SPLIT, [], {amount: aettos});
            const recipientOneBalanceNew = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceNew = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceNew = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            assert.isTrue(recipientOneBalanceNew.eq(recipientOneBalanceInitial.plus(expectedPayout1)));
            assert.isTrue(recipientTwoBalanceNew.eq(recipientTwoBalanceInitial.plus(expectedPayout2)));
            assert.isTrue(recipientThreeBalanceNew.eq(recipientThreeBalanceInitial.plus(expectedPayout3)));
        });

        it('should split payment correctly when contract balance is 5000 aettos', async () => {
            const recipientOneBalanceInitial = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceInitial = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceInitial = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            const initialAettos = new BigNumber(5000);
            await clientNonRecipient.spend(initialAettos, contractClientOwner.deployInfo.address.replace('ct_', 'ak_'))
            // check if contract balance is 5000 aettos
            const contractBalanceInitial = new BigNumber(await clientOwner.balance(contractClientOwner.deployInfo.address));
            assert.isTrue(contractBalanceInitial.eq(initialAettos))

            const aettos = new BigNumber(2000);
            const expectedPayout1 = aettos.plus(initialAettos).dividedBy(100).multipliedBy(35);
            const expectedPayout2 = aettos.plus(initialAettos).dividedBy(100).multipliedBy(40);
            const expectedPayout3 = aettos.plus(initialAettos).dividedBy(100).multipliedBy(25);

            await contractClientNonRecipient.call(paymentSplitterFunctions.PAY_AND_SPLIT, [], {amount: aettos});
            const recipientOneBalanceNew = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceNew = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceNew = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            assert.isTrue(recipientOneBalanceNew.eq(recipientOneBalanceInitial.plus(expectedPayout1)));
            assert.isTrue(recipientTwoBalanceNew.eq(recipientTwoBalanceInitial.plus(expectedPayout2)));
            assert.isTrue(recipientThreeBalanceNew.eq(recipientThreeBalanceInitial.plus(expectedPayout3)));
        });

        it('update address fails as wrong caller', async () => {
            const result = await contractClientRecipientOne.call(paymentSplitterFunctions.UPDATE_ADDRESS, [recipientTwoKeyPair.publicKey, nonRecipientKeyPair.publicKey]).catch(x => x);
            assert.equal(result.returnType, 'revert');
        });

        it('update address succeeds as recipient and owner', async () => {
            await contractClientRecipientOne.call(paymentSplitterFunctions.UPDATE_ADDRESS, [recipientOneKeyPair.publicKey, nonRecipientKeyPair.publicKey]);
            // check if nonRecipient is now recipient
            let expectedWeight = 35;
            let weightResult = await contractClientOwner.call(paymentSplitterFunctions.GET_WEIGHT, [nonRecipientKeyPair.publicKey], {callStatic: true});
            let decodedWeightResult = await weightResult.decode();
            assert.equal(decodedWeightResult, expectedWeight);
            // check if recipientOne is no longer recipient
            let isRecipientResult = await contractClientOwner.call(paymentSplitterFunctions.IS_RECIPIENT, [recipientOneKeyPair.publicKey], {callStatic: true});
            let decodedIsRecipientResult = await isRecipientResult.decode();
            assert.isFalse(decodedIsRecipientResult);

            await contractClientOwner.call(paymentSplitterFunctions.UPDATE_ADDRESS, [nonRecipientKeyPair.publicKey, recipientOneKeyPair.publicKey]);
            // check if recipientOne is recipient again
            weightResult = await contractClientOwner.call(paymentSplitterFunctions.GET_WEIGHT, [recipientOneKeyPair.publicKey], {callStatic: true});
            decodedWeightResult = await weightResult.decode();
            assert.equal(decodedWeightResult, expectedWeight);
            // check if nonRecipient is again no recipient
            isRecipientResult = await contractClientOwner.call(paymentSplitterFunctions.IS_RECIPIENT, [nonRecipientKeyPair.publicKey], {callStatic: true});
            decodedIsRecipientResult = await isRecipientResult.decode();
            assert.isFalse(decodedIsRecipientResult);

            // size should still be 3
            const expectedRecipientsCount = 3;
            const countResult = await contractClientOwner.call(paymentSplitterFunctions.GET_RECIPIENTS_COUNT, [], {callStatic: true});
            const decodedCountResult = await countResult.decode();
            assert.equal(decodedCountResult, expectedRecipientsCount);
        });

        it('update all recipientConditions fails as other caller than owner', async () => {
            recipientConditions.set(recipientOneKeyPair.publicKey, 15);
            recipientConditions.set(recipientTwoKeyPair.publicKey, 15);
            recipientConditions.set(recipientThreeKeyPair.publicKey, 20);
            recipientConditions.set(recipientFourKeyPair.publicKey, 20);
            recipientConditions.set(recipientFiveKeyPair.publicKey, 25);
            recipientConditions.set(recipientSixKeyPair.publicKey, 5);
            const result = await contractClientRecipientOne.call(paymentSplitterFunctions.UPDATE_RECIPIENT_CONDITIONS, [recipientConditions]).catch(x => x);
            assert.equal(result.returnType, 'revert');
        });

        it('update all recipientConditions succeeds as owner', async () => {
            await contractClientOwner.call(paymentSplitterFunctions.UPDATE_RECIPIENT_CONDITIONS, [recipientConditions]);
            // size should now be 6
            const expectedRecipientsCount = 6;
            const countResult = await contractClientOwner.call(paymentSplitterFunctions.GET_RECIPIENTS_COUNT, [], {callStatic: true});
            const decodedCountResult = await countResult.decode();
            assert.equal(decodedCountResult, expectedRecipientsCount);

            // check the weight of recipientFive
            let expectedWeight = 25;
            let weightResult = await contractClientOwner.call(paymentSplitterFunctions.GET_WEIGHT, [recipientFiveKeyPair.publicKey], {callStatic: true});
            let decodedWeightResult = await weightResult.decode();
            assert.equal(decodedWeightResult, expectedWeight);
        });

        it('transfer of ownership fails as other caller than owner', async () => {
            const result = await contractClientRecipientOne.call(paymentSplitterFunctions.TRANSFER_OWNERSHIP, [recipientOneKeyPair.publicKey]).catch(x => x);
            assert.equal(result.returnType, 'revert');
        });

        it('transfer of ownership succeeds as owner', async () => {
            await contractClientOwner.call(paymentSplitterFunctions.TRANSFER_OWNERSHIP, [recipientOneKeyPair.publicKey]);
            const ownerResult = await contractClientOwner.call(paymentSplitterFunctions.GET_OWNER, [], {callStatic: true});
            const decodedOwnerResult = await ownerResult.decode();
            assert.equal(decodedOwnerResult, recipientOneKeyPair.publicKey);
        });
    });
});