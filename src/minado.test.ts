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
  PrivateKey,
  fetchEvents,
} from 'snarkyjs';
import { test } from './index.js';
import { getAccount, getBalance } from 'snarkyjs/dist/node/lib/mina';

describe('Minado E2E tests', () => {
  async function runTests(
    berkley: boolean,
    zkAppSmartContractTestAddress: string
  ) {
    let Blockchain;
    let minadoPk: any;
    let minadoPrivK;
    let instance: any;
    let defaultFee = 100_000_000;
    // create an instance of the smart contract
    const zkAppTest = new test(
      PublicKey.fromBase58(zkAppSmartContractTestAddress!)
    );
    beforeAll(async () => {
      await isReady;
      if (berkley) {
        // instance = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
        Blockchain = Mina.Network({
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
    });

    afterAll(() => {
      setInterval(shutdown, 0);
    });
    //Just a text for making sure that we are in Berkley
    it(`Are we in Berkley?: ${berkley}`, async () => {
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

    //This function tests that events are being emmited and also that then they should be fetched
    //When you deploy the contract and run it once then there should be one event with the type nullifier
    it('Test to the event Nullifier fuction which emmits and event ', async () => {
      let eventsTx = await Mina.transaction(
        { sender: minadoPk, fee: defaultFee },
        () => {
          let depositCommitment = Field(0);
          zkAppTest.emitNullifierEvent(depositCommitment, minadoPk);
        }
      );
    });
    //This function tests that events are being emmited and also that then they should be fetched
    it('Test that events are coming', async () => {
      /**
       * Fetching the events
       */
      let rawevents = await zkAppTest.fetchEvents();
      console.log('THESE ARE THE EVENTS');
      console.log(rawevents);
    });

    //This function tests that we are using a function for another smart contract correctly and without problems

    //This test needs to validate that the deposit events that are being created in the Zkapp live on-chain
    // it(`Events tests`, async () => {
    //   //This should be the smart contract address
    //   let address = PublicKey.fromBase58(
    //     'B62qnPGoYZdQcjjDhadZrM1SUL1EjCxoEXaby7hmkqkeNrpwpWsBo1E'
    //   );
    //   // let balance = Mina.getBalance(address).toString();
    //   let zkapp = await fetchAccount({ publicKey: address });
    //   // let rawEvents = await zkapp.account.fetchEvents();
    //   // let despositEvents = (await rawEvents).filter((a) => (a.type = `deposit`));
    //   // use the balance of this account
    //   // let balance = account.account?.balance.toString();
    //   let expectedBalance = '49000000000';
    //   expect(balance).toEqual(expectedBalance);
    // });
  }
  runTests(true, 'B62qnspFth2TM38B62QQW272yaozwMrymrsjcn4C8v9RxGYQvJjF2he');
});
