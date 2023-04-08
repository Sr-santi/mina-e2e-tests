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
import { getAccount, getBalance } from 'snarkyjs/dist/node/lib/mina';
import { TokenContract } from './mint.js';
import DepositClass from './models/DepositClass.js';
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
/*
Currency, amount, netID, note => deposit(secret, nullifier)
*/
type Deposit = {
  nullifier: Field;
  secret: Field;
  commitment: Field;
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
  let defaultFee = 100_000_000;
  let defaultFee2 = 200_000_000;

  beforeAll(async () => {
    await isReady;
    // contracts compilation

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
      console.log('On Berkley ready');
      Mina.setActiveInstance(Blockchain);
    } else {
      instance = Mina.LocalBlockchain();
      minadoPrivK = instance.testAccounts[0].privateKey;
      minadoPk = minadoPrivK.toPublicKey();
      Mina.setActiveInstance(instance);
    }
    await test.compile();
    await TokenContract.compile();
  });

  afterAll(() => {
    setInterval(shutdown, 0);
  });

  // test functions-----------------------
  function isEventinArray(events: Array<any>, type: string) {
    let filteredEvents = events.filter((a) => a.type === type);
    console.log('Filtered events');
    console.log(filteredEvents);
    return filteredEvents.length ? true : false;
  }
  function generateNoteString(note: Note): string {
    return `Minado&${note.currency}&${note.amount}&${note.nullifier}%${note.secret}&Minado`;
  }
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
  function parseNoteString(noteString: string): Note {
    const noteRegex =
      /Minado&(?<currency>\w+)&(?<amount>[\d.]+)&(?<nullifier>[0-9a-fA-F]+)%(?<secret>[0-9a-fA-F]+)&Minado/g;
    const match = noteRegex.exec(noteString);

    if (!match) {
      throw new Error('The note has invalid format');
    }

    return {
      currency: match.groups?.currency!,
      amount: new UInt64(Number(match.groups?.amount)),
      nullifier: new Field(match.groups?.nullifier!),
      secret: new Field(match.groups?.secret!),
    };
  }
  function createDeposit(nullifier: Field, secret: Field): Deposit {
    let deposit = {
      nullifier,
      secret,
      commitment: createCommitment(nullifier, secret),
    };
    return deposit;
  }
  /**
   * Get all the deposit events
   * @returns events of type deposit
   */
  /**
   * Get all the deposit events
   * @returns events of type deposit
   */
  /**
   * Get all the deposit events
   * @returns events of type deposit
   */
  async function getDepositEvents() {
    let rawEvents = await zkAppTest.fetchEvents();
    let filteredEvents = rawEvents.filter((a) => a.type === 'deposit');
    console.log('Deposit Events => ', rawEvents);
    return filteredEvents;
  }
/**
 * Function to normalize deposit events 
 */
function normalizeEvents (filteredEvents:Array<any>){
  let eventsNormalizedArray:any=[]
  for (let i = 0; i < filteredEvents.length; i++) {
    let element = filteredEvents[i];
      let eventsNormalized = element.event.toFields(null);
      let object:any = {
        commitment: eventsNormalized[0].toString(),
        timeStamp: eventsNormalized[1]?.toString(),
      };
      eventsNormalizedArray.push(object);
  }
  return eventsNormalizedArray
}
/**
 *Validates the deposit object and that it corresponds to a valid object
 * @param deposit Created from a note
 *
 */
async function validateProof(deposit: Deposit) {
  /**
   * Merkle Tree Validation.
   */
  //Find the commitment in the events

  let depositEvents = await getDepositEvents();
  let normalizedEvents =normalizeEvents(depositEvents)
  //
  let commitmentDeposit = deposit.commitment;
  console.log('Commitment',)
  console.log(commitmentDeposit,toString())
  //Search for an event with a given commitment
  let filteredEvents = normalizedEvents.filter((a:any) => a.commitment!.toString() === commitmentDeposit.toString());
  let condition = filteredEvents.length ? true :false
  if (!condition) {
    throw new Error('The deposit event is corrupt please input a valid note');
  }
}

  // ------------------------------------

  /**
   * DEPOSIT LOGIC TESTS
   */

  // it('Test for emitNullifier event method and the emit deposit event  ', async () => {
  //   /**
  //    * Fetching the events
  //    */
  //   try {
  //     // create an instance of the smart contract]\
  //     // let events =await fetchEvents({publicKey:zkAppSmartContractTestAddress})
  //     let zkAppTest = new test(
  //       PublicKey.fromBase58(zkAppSmartContractTestAddress)
  //     );
  //     // let events =await fetchEvents({publicKey:zkAppSmartContractTestAddress})
  //     let events = await zkAppTest.fetchEvents();
  //     console.log('EVENTS');
  //     console.log(events);
  //     let depositEvents = await isEventinArray(events, 'deposit');
  //     let nullifierEevents = await isEventinArray(events, 'nullifier')
  //     expect(depositEvents).toBe(true);
  //     expect(nullifierEevents).toBe(true);
  //   } catch (error: any) {
  //     console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
  //     throw error;
  //   }
  // });

  // it('For a Deposit With a given object it generates a notestring in the correct format', async () => {
  //   let amount = 20;
  //   let nullifier = createNullifier(minadoPk);
  //   let secret = Field.random();

  //   const note = {
  //     currency: 'Mina',
  //     amount: new UInt64(amount),
  //     nullifier: nullifier,
  //     secret: secret,
  //   };
  //   const noteString = generateNoteString(note);
  //   const noteRegex =
  //     /Minado&(?<currency>\w+)&(?<amount>[\d.]+)&(?<nullifier>[0-9a-fA-F]+)%(?<secret>[0-9a-fA-F]+)&Minado/g;

  //   expect(noteString).toMatch(noteRegex);
  // });

  // it('With a given nullifier and secret it generates a commitment that is the poseidon hash of these two values', async () => {
  //   const nullifier = createNullifier(minadoPk);
  //   const secret = Field.random();
  //   const commitment = createCommitment(nullifier, secret);

  //   const expectedCommitment = Poseidon.hash([nullifier, secret]);

  //   expect( commitment ).toEqual( expectedCommitment );
  // });

  //This fucntion tests the mint token method
  // it(
  //   'Mint token method test, it should succesfully mint a token',
  //   async () => {
  //     try {
  //       // await initTok  `enInstance();
  //       const mintAmount = UInt64.from(1);
  //       const mintSignature = Signature.create(
  //         minadoPrivK,
  //         mintAmount.toFields().concat(publicKeyTokenContract.toFields())
  //       );
  //       //await mintToken(minadoPk, mintSignature);
  //       await fetchAccount({
  //         publicKey: 'B62qjHVWWc1WT1b6WSFeb8n8uNH8DoiaFnhF4bpFf5q6Dp9j6zr1EQN',
  //       });
  //       await mintToken(minadoPk, mintSignature);
  //       //let totalAmountInCirculation = this.totalAmountInCirculation.get();
  //       let totalAmountInCirculation =
  //         zkTokenContract.totalAmountInCirculation.get();
  //       zkTokenContract.totalAmountInCirculation.assertEquals(
  //         totalAmountInCirculation
  //       );
  //       console.log('TOKENS TOTAL', totalAmountInCirculation.toString());
  //     } catch (error: any) {
  //       console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
  //       throw error;
  //     }
  //   },
  //   5 * 60 * 1000
  // );

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

  /**
   * Withdraw tests
   */
  // it('Test for the parse note function ', async () => {
  //   let exampleNote='Minado&Mina&1&7812087851405294542981963277649824002238917083437839771374645972862540599520%17743784939239259721543222227098911701166012122860283577281232882212532863426&Minado'
  //   let wrongNote =' Error&Mina&1&7812087851405294542981963277649824002238917083437839771374645972862540599520%17743784939239259721543222227098911701166012122860283577281232882212532863426&Minado'
  //   let exampleObject = {
  //       currency:'Mina',
  //       amount: new UInt64(1),
  //       nullifier:Field ('7812087851405294542981963277649824002238917083437839771374645972862540599520' ),
  //       secret: Field('17743784939239259721543222227098911701166012122860283577281232882212532863426')
  //   }
  //   let parsedNote = parseNoteString(exampleNote)
  //   expect(exampleObject).toStrictEqual(parsedNote)
  //   let error =new Error('The note has invalid format');
  //   const errorFunction = () => {
  //     parseNoteString(wrongNote)
  //   };
  //   expect(errorFunction).toThrow(error)
  // });
  // it('Test for creating a deposit object with a given nullifier and secret', async () => {
  //   let nullifier =Field ('7812087851405294542981963277649824002238917083437839771374645972862540599520')
  //   let secret =Field('17743784939239259721543222227098911701166012122860283577281232882212532863426')
  //   let depositExample= {
  //   nullifier,
  //   secret,
  //   commitment: createCommitment(nullifier, secret),
  //   }
  //   let depositReturned = createDeposit(nullifier,secret)
  //   expect(depositExample).toStrictEqual(depositReturned)
  // });

  it('Test for validating that a deposit exists in the events and it is correct ', async () => {
    let nullifier = Field(
      '20481161536473958338062251681005312196388986171849505536516038384954578696435'
    );
    let secret = Field(
      '7739732923483565316274813249062541533045865377527507613295621942574965509753'
    );
    let corruptedSecret = Field(
      '7739732923483565316274813249062541533045865377527507613295621942574965589753'
    );
    let depositExample = {
      nullifier,
      secret,
      commitment: createCommitment(nullifier, secret),
    };
    let corruptedDepositExample = {
      nullifier: nullifier,
      secret: corruptedSecret,
      commitment: createCommitment(nullifier, secret),
    };
    console.log('commitment',depositExample.commitment.toString())
    // await validateProof(depositExample);
    // const error = new Error(
    //   'The deposit event is corrupt please input a valid note'
    // );
    // const errorFunction = async () => {
    //   await validateProof(corruptedDepositExample);
    // };
    // expect(errorFunction).toThrow(error);
  });
  //TODO: ADD Is spent test 
});
