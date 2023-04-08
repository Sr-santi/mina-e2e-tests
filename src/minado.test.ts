import * as dotenv from 'dotenv';
dotenv.config();
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
  Signature,
  fetchEvents,
} from 'snarkyjs';
import { test } from './MinadoTestApp.js';
import { mintToken } from './run.js';
import { getAccount, getBalance } from 'snarkyjs/dist/node/lib/mina';
import { TokenContract } from './mint.js';

const zkAppSmartContractTestAddress =
  'B62qr2JMr3GDmGu9vHxaAC1WWKBwcvSeEBJ5Q3dKEycFSMSs1JKQqZC';
const tokenContractAddress =
  'B62qjHVWWc1WT1b6WSFeb8n8uNH8DoiaFnhF4bpFf5q6Dp9j6zr1EQN';

let publicKeyTokenContract;
let zkTokenContract: TokenContract;
let zkAppTest: test;

beforeAll(async () => {
  zkAppTest = new test(PublicKey.fromBase58(zkAppSmartContractTestAddress));

  publicKeyTokenContract = PublicKey.fromBase58(tokenContractAddress);
  zkTokenContract = new TokenContract(publicKeyTokenContract);
});

describe('Minado E2E tests', () => {
  let Blockchain;
  let minadoPk: any;
  let minadoPrivK: PrivateKey;
  let instance: any;
  let defaultFee = 100_000_000;
  let isEvent: Array<any>;

  beforeAll(async () => {
    await isReady;
    // contracts compilation
    await test.compile();
    await TokenContract.compile();

    const isBerkeley = process.env.TEST_NETWORK === 'true';

    // Mina Blockchain instance : local | berkeley
    if (isBerkeley) {
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
      Mina.setActiveInstance(Blockchain);
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

  // test methods -----------------------
  function isEventinArray(events: Array<any>, type: string) {
    let filteredEvents = events.filter((a) => a.type === type);
    console.log('Filtered events');
    console.log(filteredEvents);
    return filteredEvents.length ? true : false;
  }
  // ------------------------------------

  //Just a text for making sure that we are in Berkley
  // it(`Are we in Berkley?: ${berkley}`, async () => {
  //   let address = PublicKey.fromBase58(
  //     'B62qnPGoYZdQcjjDhadZrM1SUL1EjCxoEXaby7hmkqkeNrpwpWsBo1E'
  //   );
  //   // let balance = Mina.getBalance(address).toString();
  //   let account = await fetchAccount({ publicKey: address });
  //   // use the balance of this account
  //   console.log('BALANCEEE');
  //   let balance = account.account?.balance.toString();
  //   let expectedBalance = '49000000000';
  //   expect(balance).toEqual(expectedBalance);
  // });

  it('Test for emitNullifier event method and the emit deposit event  ', async () => {
    /**
     * Fetching the events
     */
    // create an instance of the smart contract]\
    // let events =await fetchEvents({publicKey:zkAppSmartContractTestAddress})
    let zkAppTest = new test(
      PublicKey.fromBase58(zkAppSmartContractTestAddress)
    );
    // let events =await fetchEvents({publicKey:zkAppSmartContractTestAddress})
    let events = await zkAppTest.fetchEvents();
    console.log('EVENTS');
    console.log(events);
    // console.log(events[0],events)
    // let depositEvents = await isEventinArray(isEvent, 'deposit');
    // let nullifierEevents = await isEventinArray(isEvent, 'deposit');
    // expect(depositEvents).toBe(true);
    // expect(nullifierEevents).toBe(true);
  });

  //When you deploy the contract and run it once then there should be one event with the type nullifier
  it(
    'Test to the event Nullifier fuction which emmits and event ',
    async () => {
      const zkAppTestKey = PrivateKey.random();
      let eventsTx = await Mina.transaction(
        { sender: minadoPk, fee: defaultFee },
        () => {
          let depositCommitment = Field(0);
          zkAppTest.emitNullifierEvent(depositCommitment, minadoPk);
        }
      );
      await eventsTx.prove();
      await eventsTx.sign([zkAppTestKey, minadoPrivK]).send();
      console.log('Transaction send to the blockchain successfully', eventsTx);
    },
    5 * 60 * 1000
  );

  //This fucntion tests the mint toekn method
  // it('Mint token method test, it should succesfully mint a token', async () => {
  //   const mintAmount = UInt64.from(1);
  //   const mintSignature = Signature.create(
  //     minadoPrivK,
  //     mintAmount.toFields().concat(publicKeyTokenContract.toFields())
  //   );
  //   await mintToken(minadoPk, mintSignature);
  //   await fetchAccount({
  //     publicKey: 'B62qjHVWWc1WT1b6WSFeb8n8uNH8DoiaFnhF4bpFf5q6Dp9j6zr1EQN',
  //   });
  //   // await mintToken(minadoPk,mintSignature)   let totalAmountInCirculation = this.totalAmountInCirculation.get();
  //   let totalAmountInCirculation =
  //     zkTokenContract.totalAmountInCirculation.get();
  //   zkTokenContract.totalAmountInCirculation.assertEquals(
  //     totalAmountInCirculation
  //   );
  //   console.log('TOKENS TOTAL', totalAmountInCirculation.toString());
  // });

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
});
