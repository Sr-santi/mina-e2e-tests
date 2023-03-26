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

  /**
   * ZK APPs setup
   */
  const zkAppTestKey = PrivateKey.random();
  const zkAppAddress = zkAppTestKey.toPublicKey();

  const zkAppSecondKey = PrivateKey.random();
  const zkAppSecondAddress = zkAppTestKey.toPublicKey();

  // create an instance of the smart contract
  const zkAppTest = new test(
    PublicKey.fromBase58(zkAppSmartContractTestAddress!)
  );
  //Setup
  let defaultFee = 100_000_000;

  async function emitDepositAction() {
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
    /**
     * Fetching the actions
     */
    let currentDepositId = await zkAppTest.depositId.fetch();
    console.log('CURRENT DEPOSIT ID');
    console.log(currentDepositId);
  }

  /**
   * Events Transaction
   */
  async function emitNullifier() {
    let eventsTx = await Mina.transaction(
      { sender: minadoPk, fee: defaultFee },
      () => {
        let depositCommitment = Field(0);
        zkAppTest.emitNullifierEvent(depositCommitment, minadoPk);
      }
    );
    await eventsTx.prove();
    await eventsTx.sign([zkAppTestKey, minadoPrivK]).send();
    // let txHash= await eventsTx.transaction.memo.toString()
    console.log(`Events Transaction done `);
  }
  async function fetchEvents() {
    /**
     * Fetching the events
     */
    let rawevents = await zkAppTest.fetchEvents();
    console.log('THESE ARE THE EVENTS');
    console.log(rawevents);
  }

  /**
   * Standard fetch account
   */

  let accountZk = await fetchAccount({
    publicKey: zkAppSmartContractTestAddress!,
  });

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
