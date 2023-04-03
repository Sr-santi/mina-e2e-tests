import * as dotenv from 'dotenv';
dotenv.config();
import {
  isReady,
  shutdown,
  Poseidon,
  Field,
  UInt64,
  UInt32,
  Mina,
  PublicKey,
  PrivateKey,
  fetchAccount,
  Signature,
} from 'snarkyjs';
import { test } from './MinadoTestApp.js';
import { TokenContract } from './mint.js';
import { Program, ProgramInput } from './zkProgram.js';
await isReady;
///Setup
const zkAppSmartContractTestAddress =
  'B62qoNr42ZhSbNeKu7b9eSLykQ8rxcPEQNPy8uXc4HKX4JFQNF9prwD';
const tokenContractAddress =
  'B62qjHVWWc1WT1b6WSFeb8n8uNH8DoiaFnhF4bpFf5q6Dp9j6zr1EQN';

//Variables
let publicKeyTokenContract: PublicKey;
let zkTokenContract: TokenContract;
let zkAppTest: test;

/**
 * Types
 */
type Note = {
  currency: string;
  amount: UInt64;
  nullifier: Field;
  secret: Field;
};

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
  let verificationKey: string;
  let defaultFee = 100_000_000;
  let defaultFee2 = 200_000_000;

  beforeAll(async () => {
    const isBerkeley = process.env.TEST_NETWORK === 'true';

    // Mina Blockchain instance : local | berkeley 
    if (isBerkeley) {
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
      console.log('On Berkley ready');
      Mina.setActiveInstance(Blockchain);
    } else {
      instance = Mina.LocalBlockchain();
      minadoPrivK = instance.testAccounts[0].privateKey;
      minadoPk = minadoPrivK.toPublicKey();
      Mina.setActiveInstance(instance);
    }
    // compile zk program
    const { verificationKey: key } = await Program.compile();
    verificationKey = key;
    // compile contracts
    await test.compile();
    await TokenContract.compile();
  });

  afterAll(() => {
    setInterval(shutdown, 0);
  });

  // test methods -----------------------
  /**
   * Check if an specific event with a type is inside a function 
   * @param events 
   * @param type 
   * @returns True if exists, false if not
   */
  function isEventinArray(events: Array<any>, type: string) {
    let filteredEvents = events.filter((a) => a.type === type);
    return filteredEvents.length ? true : false;
  }
  /**
   * Generates note that will be stored by the use 
   * @param note 
   * @returns Note 
   */
  function generateNoteString(note: Note): string {
    return `Minado&${note.currency}&${note.amount}&${note.nullifier}%${note.secret}&Minado`;
  }
  /**
   * Creates Nullifier to avoid double spending
   * @param publicKey 
   * @returns 
   */
  function createNullifier(publicKey: PublicKey) {
    let keyString = publicKey.toFields();
    let secret = Field.random();
    let nullifierHash = Poseidon.hash([...keyString, secret]);
    return nullifierHash;
  }
  /**
   * Function to create  the Commitment C(0) = H(S(0),N(0))
   */
  function createCommitment(nullifier: Field, secret: Field) {
    return Poseidon.hash([nullifier, secret]);
  }
  /**
   * Mints token as a reward after deposit
   * @param recieverAddress 
   * @param signerPk 
   */
  async function mintToken(recieverAddress: PublicKey, signerPk: Signature) {
    try {
      const mint_txn = await Mina.transaction(
        { sender: minadoPk, fee: defaultFee2 },
        () => {
          zkAppTest.mintMinadoToken(
            publicKeyTokenContract,
            recieverAddress,
            signerPk
          );
        }
      );

      await mint_txn.prove();
      mint_txn.sign([minadoPrivK]);
      await mint_txn.send();
      console.log(`Token mintented to ${recieverAddress}`);
      console.log('Mint transaction', mint_txn.transaction);
    } catch (error: any) {
      console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
      throw error;
    }
  }
  // ------------------------------------
  /**
   * DEPOSIT LOGIC TESTS
   */

  it('Test for emitNullifier event method and the emit deposit event  ', async () => {
    try {
      let zkAppTest = new test(
        PublicKey.fromBase58(zkAppSmartContractTestAddress)
      );
      // let events =await fetchEvents({publicKey:zkAppSmartContractTestAddress})
      let events = await zkAppTest.fetchEvents();
      console.log('EVENTS');
      console.log(events);
      let depositEvents = await isEventinArray(events, 'deposit');
      let nullifierEevents = await isEventinArray(events, 'nullifier')
      expect(depositEvents).toBe(true);
      expect(nullifierEevents).toBe(true);
    } catch (error: any) {
      console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
      throw error;
    }
  });

  it('For a Deposit With a given object it generates a notestring in the correct format', async () => {
    let amount = 20;
    let nullifier = createNullifier(minadoPk);
    let secret = Field.random();

    const note = {
      currency: 'Mina',
      amount: new UInt64(amount),
      nullifier: nullifier,
      secret: secret,
    };
    const noteString = generateNoteString(note);
    const noteRegex =
      /Minado&(?<currency>\w+)&(?<amount>[\d.]+)&(?<nullifier>[0-9a-fA-F]+)%(?<secret>[0-9a-fA-F]+)&Minado/g;

    expect(noteString).toMatch(noteRegex);
  });

  it('With a given nullifier and secret it generates a commitment that is the poseidon hash of these two values', async () => {
    const nullifier = createNullifier(minadoPk);
    const secret = Field.random();
    const commitment = createCommitment(nullifier, secret);
    const expectedCommitment = Poseidon.hash([nullifier, secret]);
    expect( commitment ).toEqual( expectedCommitment );
  });
  it(
    'Mint token method test, it should succesfully mint a token',
    async () => {
      try {
        // await initTok  `enInstance();
        const mintAmount = UInt64.from(1);
        const mintSignature = Signature.create(
          minadoPrivK,
          mintAmount.toFields().concat(publicKeyTokenContract.toFields())
        );
        await fetchAccount({
          publicKey: 'B62qjHVWWc1WT1b6WSFeb8n8uNH8DoiaFnhF4bpFf5q6Dp9j6zr1EQN',
        });
        await mintToken(minadoPk, mintSignature);
        let totalAmountInCirculation =
          zkTokenContract.totalAmountInCirculation.get();
        zkTokenContract.totalAmountInCirculation.assertEquals(
          totalAmountInCirculation
        );
      } catch (error: any) {
        console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
        throw error;
      }
    },
    5 * 60 * 1000
  );

  /**
   * Withdraw tests
   */
  it('Test for emitNullifier event method and the emit deposit event  ', async () => {
    try {
      // create an instance of the smart contract]\
      let zkAppTest = new test(
        PublicKey.fromBase58(zkAppSmartContractTestAddress)
      );
      let events = await zkAppTest.fetchEvents();
      console.log('EVENTS');
      console.log(events);
      let depositEvents = await isEventinArray(events, 'deposit');
      let nullifierEevents = await isEventinArray(events, 'nullifier')
      expect(depositEvents).toBe(true);
      expect(nullifierEevents).toBe(true);
    } catch (error: any) {
      console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
      throw error;
    }
  });
  it(
    'Claim tokens and update rewards',
    async () => {
      try {
        const programInput = new ProgramInput({
          permissionUntilBlockHeight: UInt32.from(10_000),
          publicKey: minadoPk,
          signature: Signature.create(minadoPrivK, Field(0).toFields()),
        });
        console.log('Creating proof...');
        const proof = await Program.run(programInput);
        console.log('Proof created');
        const newRewardPerBlock = UInt64.from(100);
        const tx = await Mina.transaction(
          { sender: minadoPk, fee: 1e9 },
          () => {
            zkAppTest.updateRewardsPerBlock(proof, newRewardPerBlock);
            zkAppTest.approveAccountUpdate(zkAppTest.self);
          }
        );
        await tx.prove();
        await tx.sign([minadoPrivK]).send();
        console.log('Minedo.updateRewardsPerBlock() successful', tx.toPretty());
      } catch (error: any) {
        console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
        throw error;
      }
    },
    5 * 60 * 1000
  );
});
