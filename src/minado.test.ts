import {
  isReady,
  shutdown,
  Poseidon,
  Field,
  MerkleTree,
  MerkleWitness,
  UInt64,
  UInt32,
  Int64,
  Mina,
  PublicKey,
  fetchAccount,
  AccountUpdate,
} from 'snarkyjs';
import { MinadoTestApp } from './index.js';
import { getAccount, getBalance } from 'snarkyjs/dist/node/lib/mina';

describe('Minado E2E tests', () => {
  async function runTests(deployToBerkeley: boolean) {
    let Blockchain;
    beforeAll(async () => {
      await isReady;
      Blockchain = deployToBerkeley
        ? Mina.LocalBlockchain()
        : Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
      Mina.setActiveInstance(Blockchain);
    });

    afterAll(() => {
      setInterval(shutdown, 0);
    });

    it(`Are we in Berkley?: ${deployToBerkeley}`, async () => {
      let address = PublicKey.fromBase58(
        'B62qnPGoYZdQcjjDhadZrM1SUL1EjCxoEXaby7hmkqkeNrpwpWsBo1E'
      );
      // let balance = Mina.getBalance(address).toString();
      let account = await fetchAccount({ publicKey: address });
      // use the balance of this account
      console.log('BALANCEEE');
      let balance = account.account?.balance.toString();
      let expectedBalance = '49000000000';
      expect(balance).toEqual(expectedBalance);
    });
  }
  runTests(false);
});
