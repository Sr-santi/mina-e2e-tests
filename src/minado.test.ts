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
  AccountUpdate,
} from 'snarkyjs';
import { test } from './MinadoTestApp.js';
import { TokenContract } from './mint.js';
import DepositClass from './models/DepositClass.js';
import { Program, ProgramInput } from './zkProgram.js';
await isReady;
///Setup
const zkAppSmartContractTestAddress = process.env.MINADO_CONTRACT_ADDRESS || '';
const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS || '';

//Variables
let publicKeyTokenContract: PublicKey;
let zkTokenContract: TokenContract;
let zkAppTest: test;

// -------------------------------------------
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
  let verificationKey: string;
  let defaultFee = 100_000_000;
  let defaultFee2 = 200_000_000;
  let defaultFee3 = 300_000_000;
  let defaultFee4 = 400_000_000;

  beforeAll(async () => {
    const isBerkeley = process.env.TEST_NETWORK === 'true';

    // Mina Blockchain instance : local | berkeley
    if (isBerkeley) {
      Blockchain = Mina.Network({
        mina: 'https://proxy.berkeley.minaexplorer.com/graphql',
        archive: 'https://archive-node-api.p42.xyz/',
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
    await zkTokenContract.init();
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
        { sender: minadoPk, fee: defaultFee4 },
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
      currency: match.groups?.currency as string,
      amount: new UInt64(Number(match.groups?.amount)),
      nullifier: new Field(match.groups?.nullifier as string),
      secret: new Field(match.groups?.secret as string),
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
  async function getDepositEvents() {
    let rawEvents = await zkAppTest.fetchEvents();
    let filteredEvents = rawEvents.filter((a) => a.type === 'deposit');
    console.log('Deposit Events => ', rawEvents);
    return filteredEvents;
  }
  /**
   * Function to normalize deposit events
   */
  function normalizeEvents(filteredEvents: Array<any>) {
    let eventsNormalizedArray: any = [];
    for (let i = 0; i < filteredEvents.length; i++) {
      let element = filteredEvents[i];
      let eventsNormalized = element.event.toFields(null);
      let object: any = {
        commitment: eventsNormalized[0].toString(),
        timeStamp: eventsNormalized[1]?.toString(),
      };
      eventsNormalizedArray.push(object);
    }
    return eventsNormalizedArray;
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
    let normalizedEvents = normalizeEvents(depositEvents);
    //
    let commitmentDeposit = deposit.commitment;
    console.log('Commitment');
    console.log(commitmentDeposit, toString());
    //Search for an event with a given commitment
    let filteredEvents = normalizedEvents.filter(
      (a: any) => a.commitment!.toString() === commitmentDeposit.toString()
    );
    let condition = filteredEvents.length ? true : false;
    if (!condition) {
      throw new Error('The deposit event is corrupt please input a valid note');
    }
  }

  // deposit functions ------------------------------------------------------------
  /**
   * Emits deposit action
   */
  async function emitDepositAction() {
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
    await actionTx.sign([minadoPrivK]).send;
    console.log('Id of deposit updated and transaction send');
  }

  /**
   * Emits a nullifier event with it's commitment and timestamp
   */
  async function emitDepositEvent(commitment: Field, timeStamp: UInt64) {
    let eventsTx = await Mina.transaction(
      { sender: minadoPk, fee: defaultFee3 },
      () => {
        zkAppTest.emitDepositEvent(commitment, timeStamp);
      }
    );
    await eventsTx.prove();
    await eventsTx.sign([minadoPrivK]).send();
    console.log(`Deposit event emmited `);
  }

  /**
   * After the commitment is emitted in an event and the note is returned, the money should be send to the zkApp account
   * @param sender
   * @param amount
   */
  async function sendFundstoMixer(
    senderPrivKey: PrivateKey,
    amount: any,
    sender: PublicKey
  ) {
    let tx = await Mina.transaction(
      { sender: sender, fee: defaultFee2 },
      () => {
        let update = AccountUpdate.createSigned(sender);
        //The userAddress is funced
        let contractAddress = PublicKey.fromBase58(
          zkAppSmartContractTestAddress
        );
        update.send({ to: contractAddress, amount: amount });
        console.log('Sendind Funds to Minado');
        //Parece que la zkapp no puede recibir fondos
      }
    );
    await tx.prove();
    const zkAppTestKey = PrivateKey.random();
    await tx.sign([senderPrivKey]).send();
    console.log('Funds sent to minado');
  }

  /**
   * Deposit function
   * From a user account transfer funds to the zKApp smart contract, a nullifier will be created and events will be emmited
   * @param userAccount
   * @returns noteString That will be stored by the user
   */
  async function deposit(
    userAccount: PrivateKey,
    ammount: number,
    sender: PublicKey
  ) {
    //  Creating nullifier and nullifieremmiting event
    console.log("Feching account's zkAppTest");
    await fetchAccount({ publicKey: zkAppSmartContractTestAddress });
    let nullifierHash = await createNullifier(minadoPk);
    console.log('NullifierHash', nullifierHash.toString());
    //Creatting deposit commitment
    let secret = Field.random();
    let commitment = await createCommitment(nullifierHash, secret);
    console.log('commitment', commitment.toString());
    await sendFundstoMixer(userAccount, ammount, sender);
    //A note is created and send in a deposit event
    const note = {
      currency: 'Mina',
      amount: new UInt64(ammount),
      nullifier: nullifierHash,
      secret: secret,
    };
    //Generating notestring
    const noteString = generateNoteString(note);
    //TODO:CHANGE
    let timeStamp = UInt64.fromFields([Field(0)]);
    //Emiting our deposit event
    await emitDepositEvent(commitment, timeStamp);
    //Emiting deposit action for updating IDs
    await emitDepositAction();
    console.log(`Note string ${noteString}`);
    const mintAmount = UInt64.from(1);
    const mintSignature = Signature.create(
      minadoPrivK,
      mintAmount.toFields().concat(minadoPk.toFields())
    );
    //Minting a token as a reward to the user
    await mintToken(sender, mintSignature);
    return noteString;
  }

  // ------------------------------------

  it.todo('Test for emitNullifier event method and the emit deposit event');
  // it('Test for emitNullifier event method and the emit deposit event  ', async () => {
  //   console.time('emitNullifierAndEventDepositTest');
  //   try {
  //     let zkAppTest = new test(
  //       PublicKey.fromBase58(zkAppSmartContractTestAddress)
  //     );
  //     // let events =await fetchEvents({publicKey:zkAppSmartContractTestAddress})
  //     let events = await zkAppTest.fetchEvents();
  //     console.log('EVENTS');
  //     console.log(events);
  //     // we need to emit the events first
  //     let depositEvents = await isEventinArray(events, 'deposit');
  //     let nullifierEevents = await isEventinArray(events, 'nullifier');
  //     expect(depositEvents).toBe(true);
  //     // expect(nullifierEevents).toBe(true);
  //     console.timeEnd('emitNullifierAndEventDepositTest');
  //   } catch (error: any) {
  //     console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
  //     console.timeEnd('emitNullifierAndEventDepositTest');
  //     throw error;
  //   }
  // });

  /*   it('For a Deposit With a given object it generates a notestring in the correct format', async () => {
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
  }); */

  it('With a given nullifier and secret it generates a commitment that is the poseidon hash of these two values', async () => {
    console.time('createCommitmentTest');
    const nullifier = createNullifier(minadoPk);
    const secret = Field.random();
    const commitment = createCommitment(nullifier, secret);
    const expectedCommitment = Poseidon.hash([nullifier, secret]);
    expect(commitment).toEqual(expectedCommitment);
    console.timeEnd('createCommitmentTest');
  });

  it.todo('Mint token method test, it should succesfully mint a token');
  // it(
  //   'Mint token method test, it should succesfully mint a token',
  //   async () => {
  //     console.time('mintTokenTest');
  //     try {
  //       // await initTok  `enInstance();
  //       const mintAmount = UInt64.from(1);
  //       const totalAmountInCirculation0 =
  //         zkTokenContract.totalAmountInCirculation.get();
  //       expect(zkTokenContract.totalAmountInCirculation.get()).toEqual(
  //         totalAmountInCirculation0
  //       );
  //       const mintSignature = Signature.create(
  //         minadoPrivK,
  //         mintAmount.toFields().concat(publicKeyTokenContract.toFields())
  //       );
  //       await fetchAccount({
  //         publicKey: tokenContractAddress,
  //       });
  //       await mintToken(minadoPk, mintSignature);
  //       console.timeEnd('mintTokenTest');
  //     } catch (error: any) {
  //       console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
  //       console.timeEnd('mintTokenTest');
  //       throw error;
  //     }
  //   },
  //   5 * 60 * 1000
  // );

  /**
   * Withdraw tests
   */
  it('Test for the parse note function ', async () => {
    let exampleNote =
      'Minado&Mina&1&7812087851405294542981963277649824002238917083437839771374645972862540599520%17743784939239259721543222227098911701166012122860283577281232882212532863426&Minado';
    let wrongNote =
      ' Error&Mina&1&7812087851405294542981963277649824002238917083437839771374645972862540599520%17743784939239259721543222227098911701166012122860283577281232882212532863426&Minado';
    let exampleObject = {
      currency: 'Mina',
      amount: new UInt64(1),
      nullifier: Field(
        '7812087851405294542981963277649824002238917083437839771374645972862540599520'
      ),
      secret: Field(
        '17743784939239259721543222227098911701166012122860283577281232882212532863426'
      ),
    };
    let parsedNote = parseNoteString(exampleNote);
    expect(exampleObject).toStrictEqual(parsedNote);
    let error = new Error('The note has invalid format');
    const errorFunction = () => {
      parseNoteString(wrongNote);
    };
    expect(errorFunction).toThrow(error);
  });

  it(
    'Test for creating a deposit object with a given nullifier and secret',
    async () => {
      console.time('createDepositTest');
      const noteString = await deposit(minadoPrivK, 1, minadoPk);
      const note = parseNoteString(noteString);

      let depositExample = {
        nullifier: note.nullifier,
        secret: note.secret,
        commitment: createCommitment(note.nullifier, note.secret),
      };
      let depositReturned = createDeposit(note.nullifier, note.secret);
      expect(depositExample).toStrictEqual(depositReturned);
      console.timeEnd('createDepositTest');
    },
    5 * 60 * 1000
  );

  // it('Test for validating that a deposit exists in the events and it is correct ', async () => {
  //   console.time('validatingDepositExistTest');
  //   let nullifier = Field(
  //     '11585209139878798932357986174060311467267135906027654678156605460441251706059'
  //   );
  //   let secret = Field(
  //     '5998354546491085671758129686091866500834021114313521641566938626173650038487'
  //   );
  //   let corruptedSecret = Field(
  //     '5998354546491085671758129686091866500834021114313521641566938626173650038487'
  //   );
  //   let depositExample = {
  //     nullifier,
  //     secret,
  //     commitment: createCommitment(nullifier, secret),
  //   };
  //   let corruptedDepositExample = {
  //     nullifier: nullifier,
  //     secret: corruptedSecret,
  //     commitment: createCommitment(nullifier, secret),
  //   };
  //   console.log('commitment', depositExample.commitment.toString());
  //   console.timeEnd('validatingDepositExistTest');
  //   // await validateProof(depositExample);
  //   // const error = new Error(
  //   //   'The deposit event is corrupt please input a valid note'
  //   // );
  //   // const errorFunction = async () => {
  //   //   await validateProof(corruptedDepositExample);
  //   // };
  //   // expect(errorFunction).toThrow(error);
  // });

  it(
    'Claim tokens and update rewards',
    async () => {
      console.time('claimTokensTest');
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
        console.timeEnd('claimTokensTest');
      } catch (error: any) {
        console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
        console.timeEnd('claimTokensTest');
        throw error;
      }
    },
    5 * 60 * 1000
  );
});
