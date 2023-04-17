import { test } from './MinadoTestApp.js';
import {
  AccountUpdate,
  Mina,
  PrivateKey,
  PublicKey,
  shutdown,
  fetchAccount,
  Field,
  Poseidon,
  UInt64,
  Signature,
} from 'snarkyjs';
import { TokenContract } from './mint.js';
import { Program } from './zkProgram.js';
// export {init}

const zkAppSmartContractTestAddress = process.env.MINADO_CONTRACT_ADDRESS || '';
const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS || '';

let minadoPk: PublicKey;
let minadoPrivK: PrivateKey;
/*
Currency, amount, netID, note => deposit(secret, nullifier)
*/
type Deposit = {
  nullifier: Field;
  secret: Field;
  commitment: Field;
};
const isBerkeley = process.env.TEST_NETWORK === 'true';

let instance;
if (isBerkeley) {
  instance = Mina.Network({
    mina: 'https://proxy.berkeley.minaexplorer.com/graphql',
    archive: 'https://archive-node-api.p42.xyz/',
  });
  minadoPrivK = PrivateKey.fromBase58(
    'EKDxPsv3rnVvk8MVp7A5UNaL9pTVXnQkYdikuas3pHPHJyBCn4YC'
  );
  minadoPk = PublicKey.fromBase58(
    'B62qn3vM657WqhbgCtuxuxLjL6fSEkSu1CTJqSQA7uhcR9gc3uEKT1Z'
  );
  Mina.setActiveInstance(instance);
  await fetchAccount({ publicKey: minadoPk });
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

const zkAppSecondAddress = zkAppTestKey.toPublicKey();

// create an instance of the smart contract
const zkAppTest = new test(
  PublicKey.fromBase58(zkAppSmartContractTestAddress!)
);
const zkTokenContract = new TokenContract(
  PublicKey.fromBase58(tokenContractAddress)
);
await Program.compile();
console.log('Compiling zkAppTest');
let { verificationKey } = await test.compile();
await TokenContract.compile();
//Setup
let defaultFee = 100_000_000;
let defaultFee2 = 200_000_000;
let defaultFee3 = 300_000_000;
let defaultFee4 = 400_000_000;
/**
 * Types
 */
type Note = {
  currency: string;
  amount: UInt64;
  nullifier: Field;
  secret: Field;
};
/**
 * Generates a note that the user will save
 * @param note Note that the user will store
 * @returns Note
 */
function generateNoteString(note: Note): string {
  return `Minado&${note.currency}&${note.amount}&${note.nullifier}%${note.secret}&Minado`;
}
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
  await actionTx.sign([zkAppTestKey, minadoPrivK]).send;
  console.log('Id of deposit updated and transaction send');
}

/**
 * Create nullifier and emmit an event
 */
async function createNullifier(userPk: PublicKey) {
  await fetchAccount({ publicKey: minadoPk });
  let keyString = userPk.toFields();
  let secret = Field.random();
  if (secret.toString().trim().length !== 77) {
    secret = Field.random();
  }
  let nullifierHash = Poseidon.hash([...keyString, secret]);
  console.log(`Nullifier event transaction emmited `);
  return nullifierHash;
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
  await eventsTx.sign([zkAppTestKey, minadoPrivK]).send();
  console.log(`Deposit event emmited `);
}
/**
 * Function to create  the Commitment C(0) = H(S(0),N(0))
 */
function createCommitment(nullifier: Field, secret: Field) {
  console.log('Commitment created');
  return Poseidon.hash([nullifier, secret]);
}
/**
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
  let tx = await Mina.transaction({ sender: sender, fee: defaultFee2 }, () => {
    let update = AccountUpdate.createSigned(sender);
    //The userAddress is funced
    let contractAddress = PublicKey.fromBase58(zkAppSmartContractTestAddress!);
    update.send({ to: contractAddress, amount: amount });
    console.log('Sendind Funds to Minado');
    //Parece que la zkapp no puede recibir fondos
  });
  await tx.prove();
  await tx.sign([zkAppTestKey, senderPrivKey]).send();
  console.log('Funds sent to minado');
}
/**
 * Mint token Function
 */
let secondPublicKey = PublicKey.fromBase58(tokenContractAddress);
await fetchAccount({ publicKey: secondPublicKey });
export async function mintToken(
  recieverAddress: PublicKey,
  signerPk: Signature
) {
  const mint_txn = await Mina.transaction(
    { sender: minadoPk, fee: defaultFee4 },
    () => {
      zkAppTest.mintMinadoToken(secondPublicKey, recieverAddress, signerPk);
    }
  );

  await mint_txn.prove();
  mint_txn.sign([minadoPrivK]);
  await mint_txn.send();
  console.log(`Token mintented to ${recieverAddress.toBase58()}`);
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
    mintAmount.toFields().concat(zkAppSecondAddress.toFields())
  );
  //Minting a token as a reward to the user
  await mintToken(sender, mintSignature);
  console.log('Deploy succesful')
  return noteString;
}
//-----------------------------------------
/**
 * WITHDRAW LOGIC FUNCTIONS
 */
//-----------------------------------------

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

/**
 * Creates a deposit object to get a commitment from using a nullifier and a secret
 * @param nullifier Comes from the parsed note
 * @param secret Comes from the parsed node
 * @returns
 */
function createDeposit(nullifier: Field, secret: Field): Deposit {
  let deposit = {
    nullifier,
    secret,
    commitment: createCommitment(nullifier, secret),
  };
  return deposit;
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
  //Search for an event with a given commitment
  let filteredEvents = normalizedEvents.filter(
    (a: any) => a.commitment!.toString() === commitmentDeposit.toString()
  );
  let condition = filteredEvents.length ? true : false;
  if (!condition) {
    throw new Error('The deposit event is corrupt please input a valid note');
  }
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

// test functions-----------------------
function isEventinArray(events: Array<any>, type: string) {
  let filteredEvents = events.filter((a) => a.type === type);
  console.log('Filtered events');
  console.log(filteredEvents);
  return filteredEvents.length ? true : false;
}

/**
 * Emits a nullfier event after a withdraw tranaaction was succesful
 * @param nullifierHash
 */
async function emitNullifierEvent(nullifierHash: Field) {
  //Transaction
  let eventsTx = await Mina.transaction(
    { sender: minadoPk, fee: defaultFee },
    () => {
      zkAppTest.emitNullifierEvent(nullifierHash, minadoPk);
    }
  );
  await eventsTx.prove();
  await eventsTx.sign([zkAppTestKey, minadoPrivK]).send();
}

/**
 * After the nullifier and the deposit event is validated the money should be withdrawn
 * @param sender
 * @param amount
 */
async function withdrawFunds(
  senderPrivKey: PrivateKey,
  amount: any,
  sender: PublicKey,
  reciever: PublicKey
) {
  let tx = await Mina.transaction({ sender: sender, fee: defaultFee2 }, () => {
    let update = AccountUpdate.createSigned(sender);
    update.send({ to: reciever, amount: amount });
    console.log('Sendind Funds to User');
  });
  await tx.prove();
  await tx.sign([zkAppTestKey, senderPrivKey]).send();
  console.log('Funds sent to User');
}

/**
 * Get nullifier events filtered by type
 * @returns Events with type nullifier
 */
async function getNullifierEvents() {
  let rawEvents = await zkAppTest.fetchEvents();
  console.log('Events coming => ', rawEvents);
  let nullifierEvents = [];
  for (let i = 0; i < rawEvents.length; i++) {
    let element = rawEvents[i];
    if (element.type == 'nullifier') {
      let eventsNormalized = element.event.data.toFields(null);
      let object = {
        nullifier: eventsNormalized[0]?.toString(),
        timeStamp: eventsNormalized[1]?.toString(),
      };
      nullifierEvents.push(object);
    }
  }
  console.log('Nullifier Events');
  console.log(nullifierEvents);
  // return rawEvents.filter((a) => (a.type = `nullifier` && ));
  return nullifierEvents;
}

async function isSpend(nullifier: string) {
  let nullfierEvents = await getNullifierEvents();

  //return rawEvents.filter((a) => (a.type == `nullifier` ));
  let fitleredArray = nullfierEvents.filter((a) => a.nullifier == nullifier);
  if (fitleredArray.length > 0) {
    throw new Error('The note was already spent');
  }
  return false;
}

/**
 *
 * Withdraw function
 * @param noteString Note provided by the user
 * @returns
 */
async function withdraw(noteString: string, userAddress: PublicKey) {
  //First we will create comminment from the note
  //Verify the note, verify that the nullifier is not in the envents
  //Verify that the account is something
  try {
    /**Note is parsed */
    let parsedNote = parseNoteString(noteString);

    let deposit = createDeposit(parsedNote.nullifier, parsedNote.secret);
    /**Verofy thAT THE COMMITMENT MATCHES THE ENENT */
    await validateProof(deposit);
    let amount = parsedNote.amount.value;
    //Verify that that an hour already passed after deposiTt
    let contractPK = PublicKey.fromBase58(zkAppSmartContractTestAddress);
    await isSpend(parsedNote.nullifier.toString());
    await withdrawFunds(minadoPrivK, amount, contractPK, userAddress);
    //Emiting the nullifier event after the withdraw is done
    await emitNullifierEvent(parsedNote.nullifier);
    let events = await getNullifierEvents();
    console.log('EVENTS NULLIFIER? => ', events);
  } catch (e) {
    console.error(e);
    alert(e);
    return 'error';
  }
}

await deposit(minadoPrivK, 1, minadoPk);
await shutdown();
