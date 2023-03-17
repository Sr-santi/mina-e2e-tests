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
import { AccountUpdate, Mina, PrivateKey, PublicKey, shutdown } from 'snarkyjs';
import { second } from './second.js';
// setup
// const Local = Mina.LocalBlockchain();
// Mina.setActiveInstance(Local);
const dev = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
Mina.setActiveInstance(dev);
// const { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];

//ZK APP setup
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

// create an instance of the smart contract
//TODO:CHANGE THIS WITH THE CONTRACT YOU NEED TO DEPLOY
const zkApp = new second(zkAppAddress);
//Keys
let minadoPk = PublicKey.fromBase58(
  'B62qn3vM657WqhbgCtuxuxLjL6fSEkSu1CTJqSQA7uhcR9gc3uEKT1Z'
);
console.log();
let minadoPrivK = PrivateKey.fromBase58(
  'EKDxPsv3rnVvk8MVp7A5UNaL9pTVXnQkYdikuas3pHPHJyBCn4YC'
);
console.log('Deploying and initializing Minado Test App...');
let { verificationKey } = await test.compile();
let defaultFee = 100_000_000;
let deployTx = await Mina.transaction(
  { sender: minadoPk, fee: defaultFee },
  () => {
    // AccountUpdate.fundNewAccount(accounts[0].toPublicKey(), 2);
    zkApp.deploy({ zkappKey: zkAppPrivateKey });
  }
);
await deployTx.prove();
await deployTx.sign([zkAppPrivateKey, minadoPrivK]).send();
console.log(`DEPLOYED AT => ${zkAppAddress.toBase58()}`);
// console.log('Deploy done');
// try {
//   let tx = await Mina.transaction(sender, () => {
//     zkApp.submitSolution(Sudoku.from(sudoku), Sudoku.from(noSolution));
//   });
//   await tx.prove();
//   await tx.sign([senderKey]).send();
// } catch {
//   console.log('There was an error submitting the solution, as expected');
// }
// cleanup
await shutdown();
