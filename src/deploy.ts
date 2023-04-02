import { test } from './MinadoTestApp.js';
import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  shutdown,
  fetchAccount,
} from 'snarkyjs';
import { second } from './second.js';
import { TokenContract } from './mint.js';
import { Program } from './zkProgram.js';
// setup
// const Local = Mina.LocalBlockchain();
// Mina.setActiveInstance(Local);
async function deploy(berkley: boolean) {
  let minadoPk: PublicKey;
  let minadoPrivK: PrivateKey;

  let instance;
  if (berkley) {
    instance = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
    minadoPrivK = PrivateKey.fromBase58(
      'EKDxPsv3rnVvk8MVp7A5UNaL9pTVXnQkYdikuas3pHPHJyBCn4YC'
    );
    minadoPk = PublicKey.fromBase58(
      'B62qn3vM657WqhbgCtuxuxLjL6fSEkSu1CTJqSQA7uhcR9gc3uEKT1Z'
    );
    Mina.setActiveInstance(instance);
  } else {
    instance = Mina.LocalBlockchain();
    minadoPrivK = instance.testAccounts[0].privateKey;
    minadoPk = minadoPrivK.toPublicKey();
    Mina.setActiveInstance(instance);
  }
  // const { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];

  //ZK APPs setup
  const zkAppTestKey = PrivateKey.random();
  const zkAppAddress = zkAppTestKey.toPublicKey();

  // create an instance of the smart contract
  //TODO:CHANGE THIS WITH THE CONTRACT YOU NEED TO DEPLOY
  const zkAppTest = new test(zkAppAddress);
  //   const zkAppSecond = new second(zkAppSecondAddress);

  console.log('Deploying and initializing Minado Test App...');

  //Setup
  //TODO:Also change when deploying
  await Program.compile();
  let { verificationKey } = await test.compile();
  let defaultFee = 300_000_000;

  // //Deployment logic
  let deployTx = await Mina.transaction(
    { sender: minadoPk, fee: defaultFee },
    () => {
      AccountUpdate.fundNewAccount(minadoPk);
      zkAppTest.deploy({ zkappKey: zkAppTestKey });
    }
  );
  await deployTx.prove();
  await deployTx.sign([zkAppTestKey, minadoPrivK]).send();
  console.log(`DEPLOY SUCCESFUL AT => ${zkAppAddress.toBase58()}`);
  await shutdown();
}
await deploy(true);
