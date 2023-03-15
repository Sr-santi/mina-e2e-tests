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
import { MinadoTestApp } from './MinadoTestApp';
import { AccountUpdate, Mina, PrivateKey, shutdown } from 'snarkyjs';

// setup
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];

//ZK APP setup
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

// create an instance of the smart contract
const zkApp = new MinadoTestApp(zkAppAddress);

console.log('Deploying and initializing Minado Test App...');
await MinadoTestApp.compile();
let tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  zkApp.deploy();
  console.log('Wallet funded succesfully');
});
await tx.prove();
await tx.sign([zkAppPrivateKey, senderKey]).send();
console.log('Deploy done');

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
