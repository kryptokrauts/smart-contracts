const Ae = require('@aeternity/aepp-sdk').Universal;
const Crypto = require('@aeternity/aepp-sdk').Crypto;
const BigNumber = require('bignumber.js');

const config = {
    host: "http://localhost:3001/",
    internalHost: "http://localhost:3001/internal/",
    compilerUrl: "https://compiler.aepps.com"
};

describe('PaymentSplitter Contract', () => {

    let contractSource;
    let contractClient;
    let clientOwner, clientRecipientOne, clientRecipientTwo, clientRecipientThree;
    let ownerKeyPair = wallets[0];
    let recipientOneKeyPair = wallets[1];
    let recipientTwoKeyPair = wallets[2];
    let recipientThreeKeyPair = wallets[3];
    let nonRecipientKeyPair = wallets[4];
    let recipientsMap = new Map();

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
    });

    it('PaymentSplitter Contract, SUCCESS deploy and initialize', async () => {
        recipientsMap.set(recipientOneKeyPair.publicKey, 35);
        recipientsMap.set(recipientTwoKeyPair.publicKey, 40);
        recipientsMap.set(recipientThreeKeyPair.publicKey, 25);

        contractSource = utils.readFileRelative('./contracts/PaymentSplitter.aes', 'utf-8');
        contractClient = await clientOwner.getContractInstance(contractSource);

        const deploy = await contractClient.deploy([recipientsMap]);

        assert.equal(deploy.deployInfo.result.returnType, 'ok', 'Could not deploy the PaymentSplitter Smart Contract');
    });

    it('PaymentSplitter Contract, FAILURE deploy and initialize with weight sum other than 100', async () => {
        recipientsMap.set(recipientOneKeyPair.publicKey, 35);
        recipientsMap.set(recipientTwoKeyPair.publicKey, 40);
        recipientsMap.set(recipientThreeKeyPair.publicKey, 5);

        const contractClientFailDeploy = await clientOwner.getContractInstance(contractSource);
        const deploy = await contractClientFailDeploy.deploy([recipientsMap]);

        assert.equal(deploy.deployInfo.result.returnType, 'revert', 'Deploy the PaymentSplitter Smart Contract did not revert');
    });

});