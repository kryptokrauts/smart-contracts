const Ae = require('@aeternity/aepp-sdk').Universal;
const Deployer = require('forgae-lib').Deployer;
const CONTRACT_PATH = "./contracts/PaymentSplitter.aes";
const BigNumber = require('bignumber.js');

const config = {
    host: "http://localhost:3001/",
    internalHost: "http://localhost:3001/internal/",
    compilerUrl: "https://compiler.aepps.com"
};

describe('PaymentSplitter Contract', () => {
    let contractAddress;
    let deployer;
    let deployedContractOwner;
    let deployedContractRecipientOne;
    let deployedContractNonRecipient;
    
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
        deployer = new Deployer('local', ownerKeyPair.secretKey)

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
    
            try {
                await deployer.deploy(CONTRACT_PATH, [recipientConditions]);
                assert.fail('Deployment of PaymentSplitter should have beend reverted.'); 
            } catch (e) {
                console.log(e.decodedError);
            }
        });

        it('SUCCESS deploy and initialize', async () => {
            recipientConditions.set(recipientOneKeyPair.publicKey, 35);
            recipientConditions.set(recipientTwoKeyPair.publicKey, 40);
            recipientConditions.set(recipientThreeKeyPair.publicKey, 25);
        
            deployedContractOwner = await deployer.deploy(CONTRACT_PATH, [recipientConditions]);
            deployedContractRecipientOne = await deployedContractOwner.from(recipientOneKeyPair.secretKey);
            deployedContractRecipientTwo = await deployedContractOwner.from(recipientTwoKeyPair.secretKey);
            deployedContractRecipientThree = await deployedContractOwner.from(recipientThreeKeyPair.secretKey);
            deployedContractNonRecipient = await deployedContractOwner.from(nonRecipientKeyPair.secretKey);

            contractAddress = deployedContractOwner.deployInfo.address;
        });
    });

    describe('Interact with contract', async () => {
        it('should have the correct initial state', async () => {
            // owner
            const ownerResult = await deployedContractOwner.getOwner({callStatic: true});
            assert.equal(ownerResult, ownerKeyPair.publicKey);

            // weights
            const expectedWeightRecipientOne = 35;
            const expectedWeightRecipientTwo = 40;
            const expectedWeightRecipientThree = 25;
            const weightRecipientOneResult = await deployedContractOwner.getWeight(recipientOneKeyPair.publicKey, {callStatic: true});
            const weightRecipientTwoResult = await deployedContractOwner.getWeight(recipientTwoKeyPair.publicKey, {callStatic: true});
            const weightRecipientThreeResult = await deployedContractOwner.getWeight(recipientThreeKeyPair.publicKey, {callStatic: true});
            assert.equal(weightRecipientOneResult, expectedWeightRecipientOne);
            assert.equal(weightRecipientTwoResult, expectedWeightRecipientTwo);
            assert.equal(weightRecipientThreeResult, expectedWeightRecipientThree);

            // size
            const expectedRecipientsCount = 3;
            const countResult = await deployedContractOwner.getRecipientsCount({callStatic: true});
            assert.equal(countResult, expectedRecipientsCount);

            // is recipient true (=1)
            let isRecipientResult = await deployedContractOwner.isRecipient(recipientOneKeyPair.publicKey, {callStatic: true});
            assert.equal(1, isRecipientResult);

            // is recipient false (=0)
            isRecipientResult = await deployedContractOwner.isRecipient(nonRecipientKeyPair.publicKey, {callStatic: true});
            assert.equal(0, isRecipientResult);
        });

        it('should split payment correctly when contract balance is 0', async () => {
            const recipientOneBalanceInitial = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceInitial = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceInitial = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            console.log(contractAddress);
            // check if contract balance is 0
            const contractBalanceInitial = new BigNumber(await clientOwner.balance(contractAddress));
            assert.equal(contractBalanceInitial, 0)

            const aettos = new BigNumber(2000);
            const expectedPayout1 = aettos.dividedBy(100).multipliedBy(35);
            const expectedPayout2 = aettos.dividedBy(100).multipliedBy(40);
            const expectedPayout3 = aettos.dividedBy(100).multipliedBy(25);

            await deployedContractNonRecipient.payAndSplit({value: aettos});
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
            await clientNonRecipient.spend(initialAettos, contractAddress.replace('ct_', 'ak_'))
            // check if contract balance is 5000 aettos
            const contractBalanceInitial = new BigNumber(await clientOwner.balance(contractAddress));
            assert.isTrue(contractBalanceInitial.eq(initialAettos))

            const aettos = new BigNumber(2000);
            const expectedPayout1 = aettos.plus(initialAettos).dividedBy(100).multipliedBy(35);
            const expectedPayout2 = aettos.plus(initialAettos).dividedBy(100).multipliedBy(40);
            const expectedPayout3 = aettos.plus(initialAettos).dividedBy(100).multipliedBy(25);

            await deployedContractNonRecipient.payAndSplit({value: aettos});
            const recipientOneBalanceNew = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceNew = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceNew = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            assert.isTrue(recipientOneBalanceNew.eq(recipientOneBalanceInitial.plus(expectedPayout1)));
            assert.isTrue(recipientTwoBalanceNew.eq(recipientTwoBalanceInitial.plus(expectedPayout2)));
            assert.isTrue(recipientThreeBalanceNew.eq(recipientThreeBalanceInitial.plus(expectedPayout3)));
        });

        it('update address fails as wrong caller', async () => {
            try {
                await deployedContractRecipientOne.updateAddress(recipientTwoKeyPair.publicKey, nonRecipientKeyPair.publicKey);
                assert.fail(); 
            } catch (e) {
                console.log(e.decodedError);
            }
        });

        it('update address succeeds as recipient and owner', async () => {
            await deployedContractRecipientOne.updateAddress(recipientOneKeyPair.publicKey, nonRecipientKeyPair.publicKey);
            // check if nonRecipient is now recipient
            let expectedWeight = 35;
            let weightResult = await deployedContractOwner.getWeight(nonRecipientKeyPair.publicKey, {callStatic: true});
            assert.equal(weightResult, expectedWeight);
            // check if recipientOne is no longer recipient
            let isRecipientResult = await deployedContractOwner.isRecipient(recipientOneKeyPair.publicKey, {callStatic: true});
            assert.equal(0, isRecipientResult);

            await deployedContractOwner.updateAddress(nonRecipientKeyPair.publicKey, recipientOneKeyPair.publicKey);
            // check if recipientOne is recipient again
            weightResult = await deployedContractOwner.getWeight(recipientOneKeyPair.publicKey, {callStatic: true});
            assert.equal(weightResult, expectedWeight);
            // check if nonRecipient is again no recipient
            isRecipientResult = await deployedContractOwner.isRecipient(nonRecipientKeyPair.publicKey, {callStatic: true});
            assert.equal(0, isRecipientResult);

            // size should still be 3
            const expectedRecipientsCount = 3;
            const countResult = await deployedContractOwner.getRecipientsCount({callStatic: true});
            assert.equal(countResult, expectedRecipientsCount);
        });

        it('update all recipientConditions fails as other caller than owner', async () => {
            recipientConditions.set(recipientOneKeyPair.publicKey, 15);
            recipientConditions.set(recipientTwoKeyPair.publicKey, 15);
            recipientConditions.set(recipientThreeKeyPair.publicKey, 20);
            recipientConditions.set(recipientFourKeyPair.publicKey, 20);
            recipientConditions.set(recipientFiveKeyPair.publicKey, 25);
            recipientConditions.set(recipientSixKeyPair.publicKey, 5);
            try {
                await deployedContractRecipientOne.updateRecipientConditions(recipientConditions);
                assert.fail(); 
            } catch (e) {
                console.log(e.decodedError);
            }
        });

        it('update all recipientConditions succeeds as owner', async () => {
            await deployedContractOwner.updateRecipientConditions(recipientConditions);
            // size should now be 6
            const expectedRecipientsCount = 6;
            const countResult = await deployedContractOwner.getRecipientsCount({callStatic: true});
            assert.equal(countResult, expectedRecipientsCount);

            // check the weight of recipientFive
            let expectedWeight = 25;
            let weightResult = await deployedContractOwner.getWeight(recipientFiveKeyPair.publicKey, {callStatic: true});
            assert.equal(weightResult, expectedWeight);
        });

        it('transfer of ownership fails as other caller than owner', async () => {
            try {
                await deployedContractRecipientOne.transferOwnership(recipientOneKeyPair.publicKey);
                assert.fail(); 
            } catch (e) {
                console.log(e.decodedError);
            }
        });

        it('transfer of ownership succeeds as owner', async () => {
            await deployedContractOwner.transferOwnership(recipientOneKeyPair.publicKey);
            const ownerResult = await deployedContractOwner.getOwner({callStatic: true});
            assert.equal(ownerResult, recipientOneKeyPair.publicKey);
        });
    });
});