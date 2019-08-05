const Ae = require('@aeternity/aepp-sdk').Universal;
const Deployer = require('forgae-lib').Deployer;
const CONTRACT_PATH = "./contracts/BatchPayment.aes";
const BigNumber = require('bignumber.js');

const config = {
    host: "http://localhost:3001/",
    internalHost: "http://localhost:3001/internal/",
    compilerUrl: "http://localhost:3080"
};

describe('BatchPayment Contract', () => {
    let contractAddress;
    let deployer;
    let deployedContractOwner;
    let deployedContractRecipientOne;
    
    let clientOwner, clientRecipientOne, clientRecipientTwo, clientRecipientThree;
    let ownerKeyPair = wallets[0];
    let recipientOneKeyPair = wallets[1];
    let recipientTwoKeyPair = wallets[2];
    let recipientThreeKeyPair = wallets[3];
    let batchPaymentMap = new Map();

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
    });

    describe('Deploy contract', async () => {
        it('SUCCESS deploy and initialize', async () => {
            deployedContractOwner = await deployer.deploy(CONTRACT_PATH);
            deployedContractRecipientOne = await deployedContractOwner.from(recipientOneKeyPair.secretKey);
            contractAddress = deployedContractOwner.address;
        });
    });

    describe('Interact with contract', async () => {
        it('should proceed batch payment correctly', async () => {
            const recipientOneAmount = new BigNumber(10000);
            const recipientTwoAmount = new BigNumber(20000);
            const recipientThreeAmount = new BigNumber(30000);
            const totalAettos = recipientOneAmount.plus(recipientTwoAmount).plus(recipientThreeAmount);
            batchPaymentMap.set(recipientOneKeyPair.publicKey, recipientOneAmount);
            batchPaymentMap.set(recipientTwoKeyPair.publicKey, recipientTwoAmount);
            batchPaymentMap.set(recipientThreeKeyPair.publicKey, recipientThreeAmount);

            const recipientOneBalanceInitial = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceInitial = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceInitial = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            await deployedContractOwner.proceedBatchPayment(batchPaymentMap, {amount: totalAettos});
            const recipientOneBalanceNew = new BigNumber(await clientRecipientOne.balance(recipientOneKeyPair.publicKey));
            const recipientTwoBalanceNew = new BigNumber(await clientRecipientTwo.balance(recipientTwoKeyPair.publicKey));
            const recipientThreeBalanceNew = new BigNumber(await clientRecipientThree.balance(recipientThreeKeyPair.publicKey));

            assert.isTrue(recipientOneBalanceNew.eq(recipientOneBalanceInitial.plus(recipientOneAmount)));
            assert.isTrue(recipientTwoBalanceNew.eq(recipientTwoBalanceInitial.plus(recipientTwoAmount)));
            assert.isTrue(recipientThreeBalanceNew.eq(recipientThreeBalanceInitial.plus(recipientThreeAmount)));
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
            assert.equal(ownerResult.decodedResult, recipientOneKeyPair.publicKey);
        });
    });
});