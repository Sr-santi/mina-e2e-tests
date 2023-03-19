/**
 * This file specifies how to run the `MinadoTestApp` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifies a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/run.js`.
 */
import { test } from './MinadoTestApp.js';
import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  shutdown,
  fetchAccount,
  Field,
} from 'snarkyjs';
import { second } from './second.js';
// setup
// const Local = Mina.LocalBlockchain();
// Mina.setActiveInstance(Local);
async function init(
  berkley: boolean,
  zkAppSmartContractTestAddress: string | undefined,
  zkAppSmartContractSecondAddress: string | undefined
) {
  let minadoPk: PublicKey;
  let minadoPrivK: PrivateKey;

  let instance;
  if (berkley) {
    // instance = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
    instance = Mina.Network({
      mina: 'https://proxy.berkeley.minaexplorer.com/graphql',
      archive: 'https://archive.berkeley.minaexplorer.com/',
    });
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

  const zkAppSecondKey = PrivateKey.random();
  const zkAppSecondAddress = zkAppTestKey.toPublicKey();

  // create an instance of the smart contract
  //TODO:CHANGE THIS WITH THE CONTRACT YOU NEED TO DEPLOY
  const zkAppTest = new test(
    PublicKey.fromBase58(zkAppSmartContractTestAddress!)
  );
  // const zkAppSecond = new second(zkAppSecondAddress);
  //Setup
  let { verificationKey } = await test.compile();
  let defaultFee = 100_000_000;
  //Geting the value of depositId befote
  let prevDepositId = await zkAppTest.depositId.fetch();
  /**
   * Emiting an action to update the depositId
   */
  let actionTx = await Mina.transaction(
    { sender: minadoPk, fee: defaultFee },
    () => {
      zkAppTest.updateIdOfDeposit();
    }
  );
  await actionTx.prove();
  await actionTx.sign([zkAppTestKey, minadoPrivK]).send;
  console.log('Id of deposit updated and transaction send');
  let currentDepositId = await zkAppTest.depositId.fetch();
  console.log('CURRENT DEPOSIT ID');
  console.log(currentDepositId);
  /**
   * Fetching the actions
   */

  /**
   * Events Transaction
   */
  let eventsTx = await Mina.transaction(
    { sender: minadoPk, fee: defaultFee },
    () => {
      let depositCommitment = Field(0);
      zkAppTest.emitNullifierEvent(depositCommitment,minadoPk);
    }
  );
  await eventsTx.prove();
  await eventsTx.sign([zkAppTestKey, minadoPrivK]).send();
  // let txHash= await eventsTx.transaction.memo.toString()
  console.log(`Events Transaction done `);

  /**
   * Fetching the events
   */
  let rawevents = await zkAppTest.fetchEvents();
  console.log('THESE ARE THE EVENTS');
  console.log(rawevents);
  /**
   * Standard fetch account
   */

  let accountZk = await fetchAccount({
    publicKey: zkAppSmartContractTestAddress!,
  });
  //TODO: Just as a reminder fetchEvents is not working rn

  // await (
  //   await deployTx.send()
  // ).wait({
  //   maxAttempts: 90,
  // });
  /**
   * Second deploy
   */
  // let deployTx2 = await Mina.transaction(
  //   { sender: minadoPk, fee: defaultFee },
  //   () => {
  //     // AccountUpdate.fundNewAccount(accounts[0].toPublicKey(), 2);
  //     zkAppSecond.deploy({ zkappKey: zkAppSecondKey });
  //   }
  // );
  // await deployTx2.sign([zkAppSecondKey, minadoPrivK])
  // await deployTx2.prove();
  // await deployTx2.sign([zkAppSecondKey, minadoPrivK]).send();
  // await (
  //   await deployTx2.send()
  // ).wait({
  //   maxAttempts: 90,
  // });
  // console.log('SECOND DEPLOY SUCCESFUL')
  // let account = await fetchAccount({ publicKey: deployAddressOne });
  // console.log('WHAT IS THIS')
  // console.log(account)
  // console.log(account.account?.zkapp?.appState)
  // console.log(`DEPLOYED AT => ${zkAppAddress.toBase58()}`);

  /**
   * Callstack availability test
   */
  // let testAccountPrivK = PrivateKey.random();
  // let testAccountPk = PublicKey.fromPrivateKey(testAccountPrivK);
  // let tx = await Mina.transaction({ sender: minadoPk, fee: defaultFee }, () => {
  //   let hashedNullifier = zkAppTest.manageDeposit(
  //     testAccountPk,
  //     zkAppSecondAddress
  //   );
  //   console.log('This happened');
  //   console.log(hashedNullifier);
  // });
  // // await tx.sign([zkAppTestKey, minadoPrivK])
  // await tx.prove();
  // await tx.sign([zkAppTestKey, minadoPrivK]).send();
  // console.log('Update happened');
  await shutdown();
}
init(
  true,
  'B62qnspFth2TM38B62QQW272yaozwMrymrsjcn4C8v9RxGYQvJjF2he',
  undefined
);
