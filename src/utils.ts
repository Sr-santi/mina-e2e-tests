import {
  AccountUpdate,
  fetchAccount,
  Field,
  Mina,
  Poseidon,
  PrivateKey,
  PublicKey,
  Signature,
  UInt64,
} from 'snarkyjs';
import { test } from './MinadoTestApp';
import { TokenContract } from './mint';

/**
 * Types
 */
export type Note = {
  currency: string;
  amount: UInt64;
  nullifier: Field;
  secret: Field;
};
/*
  Currency, amount, netID, note => deposit(secret, nullifier)
  */
export type Deposit = {
  nullifier: Field;
  secret: Field;
  commitment: Field;
};

export interface BaseTransaction {
  userPriKeyFirst: PrivateKey;
  feePayerPublicKey: PublicKey;
  transactionFee: number;
}

export interface MinadoTransaction extends BaseTransaction {
  contract: test;
}
export interface TokenTransaction extends BaseTransaction {
  contract: TokenContract;
}

export interface EmitDepositEventType extends MinadoTransaction {
  commitment: Field;
  timeStamp: UInt64;
}

export interface SendFundstoMixerType extends BaseTransaction {
  zkAppSmartContractTestAddress: string;
  amount: number | bigint | UInt64;
}

export interface MintTokenType extends MinadoTransaction {
  publicKeyTokenContract: PublicKey;
  recieverAddress: PublicKey;
  signerPk: Signature;
}
// test methods -----------------------

interface ToString {
  toString: () => string;
}

export const makeAndSendTransaction = async <State extends ToString>({
  feePayerPublicKey,
  mutateZkApp,
  transactionFee,
  signTx,
}: {
  feePayerPublicKey: PublicKey;
  mutateZkApp: () => void;
  transactionFee: number;
  signTx: (tx: Mina.Transaction) => void;
}) => {
  let transaction = await Mina.transaction(
    { sender: feePayerPublicKey, fee: transactionFee },
    () => {
      mutateZkApp();
    }
  );
  await transaction.prove();
  signTx(transaction);
  console.log('Sending the transaction...');
  const res = await transaction.send();
  const hash = await res.hash(); // This will change in a future version of SnarkyJS
  if (hash == null) {
    throw new Error('error sending transaction');
  } else {
    res.wait({ maxAttempts: 1000 });
    console.log(
      'See transaction at',
      'https://berkeley.minaexplorer.com/transaction/' + hash
    );
  }
};

/**
 * Check if an specific event with a type is inside a function
 * @param events
 * @param type
 * @returns True if exists, false if not
 */
export function isEventinArray(events: Array<any>, type: string) {
  let filteredEvents = events.filter((a) => a.type === type);
  return filteredEvents.length ? true : false;
}
/**
 * Generates note that will be stored by the use
 * @param note
 * @returns Note
 */
export function generateNoteString(note: Note): string {
  return `Minado&${note.currency}&${note.amount}&${note.nullifier}%${note.secret}&Minado`;
}
/**
 * Creates Nullifier to avoid double spending
 * @param publicKey
 * @returns
 */
export function createNullifier(publicKey: PublicKey) {
  let keyString = publicKey.toFields();
  let secret = Field.random();
  let nullifierHash = Poseidon.hash([...keyString, secret]);
  return nullifierHash;
}
/**
 * Function to create  the Commitment C(0) = H(S(0),N(0))
 */
export function createCommitment(nullifier: Field, secret: Field) {
  return Poseidon.hash([nullifier, secret]);
}
/**
 * Mints token as a reward after deposit
 * @param recieverAddress
 * @param signerPk
 */
async function mintToken({
  userPriKeyFirst, //minadoPrivK
  feePayerPublicKey, // minadoPk
  transactionFee,
  contract,
  publicKeyTokenContract,
  recieverAddress,
  signerPk,
}: MintTokenType) {
  try {
    await makeAndSendTransaction({
      feePayerPublicKey,
      mutateZkApp: () => {
        contract.mintMinadoToken(
          publicKeyTokenContract,
          recieverAddress,
          signerPk
        );
      },
      transactionFee,
      signTx(tx: Mina.Transaction) {
        tx.sign([userPriKeyFirst]);
      },
    });
    console.log(`Token mintented to ${recieverAddress}`);
  } catch (error: any) {
    console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
    throw error;
  }
}

// ======================================================================

export function parseNoteString(noteString: string): Note {
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
export function createDeposit(nullifier: Field, secret: Field): Deposit {
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
export async function getDepositEvents(contract: test) {
  let rawEvents = await contract.fetchEvents();
  let filteredEvents = rawEvents.filter((a) => a.type === 'deposit');
  console.log('Deposit Events => ', rawEvents);
  return filteredEvents;
}
/**
 * Function to normalize deposit events
 */
export function normalizeEvents(filteredEvents: Array<any>) {
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
export async function validateProof(deposit: Deposit, contract: test) {
  /**
   * Merkle Tree Validation.
   */
  //Find the commitment in the events

  let depositEvents = await getDepositEvents(contract);
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
export async function emitDepositAction({
  userPriKeyFirst, //minadoPrivK
  feePayerPublicKey, // minadoPk
  transactionFee,
  contract,
}: MinadoTransaction) {
  /**
   * Emiting an action to update the depositId
   */
  await makeAndSendTransaction({
    feePayerPublicKey,
    mutateZkApp: () => {
      contract.updateIdOfDeposit();
    },
    transactionFee,
    signTx(tx: Mina.Transaction) {
      tx.sign([userPriKeyFirst]);
    },
  });
  console.log('Id of deposit updated and transaction send');
}

/**
 * Emits a nullifier event with it's commitment and timestamp
 */
export async function emitDepositEvent({
  userPriKeyFirst, //minadoPrivK
  feePayerPublicKey, // minadoPk
  transactionFee,
  contract,
  commitment,
  timeStamp,
}: EmitDepositEventType) {
  await makeAndSendTransaction({
    feePayerPublicKey,
    mutateZkApp: () => {
      contract.emitDepositEvent(commitment, timeStamp);
    },
    transactionFee,
    signTx(tx: Mina.Transaction) {
      tx.sign([userPriKeyFirst]);
    },
  });
  console.log(`Deposit event emmited `);
}

/**
 * After the commitment is emitted in an event and the note is returned, the money should be send to the zkApp account
 * @param sender
 * @param amount
 */
export async function sendFundstoMixer({
  userPriKeyFirst, //minadoPrivK
  feePayerPublicKey, // minadoPk
  transactionFee,
  zkAppSmartContractTestAddress,
  amount,
}: SendFundstoMixerType) {
  await makeAndSendTransaction({
    feePayerPublicKey,
    mutateZkApp: () => {
      let update = AccountUpdate.createSigned(feePayerPublicKey);
      //The userAddress is funced
      let contractAddress = PublicKey.fromBase58(zkAppSmartContractTestAddress);
      update.send({ to: contractAddress, amount: amount });
      console.log('Sendind Funds to Minado');
      //Parece que la zkapp no puede recibir fondos
    },
    transactionFee,
    signTx(tx: Mina.Transaction) {
      tx.sign([userPriKeyFirst]);
    },
  });
  console.log('Funds sent to minado');
}

/**
 * Deposit function
 * From a user account transfer funds to the zKApp smart contract, a nullifier will be created and events will be emmited
 * @param userAccount
 * @returns noteString That will be stored by the user
 */
export async function deposit(
  transactionFee: number,
  contract: test,
  smartContractAddress: string,
  publicKeyTokenContract: PublicKey,
  userAccount: PrivateKey,
  amount: number,
  sender: PublicKey
) {
  //  Creating nullifier and nullifieremmiting event
  console.log("Feching account's zkAppTest");
  await fetchAccount({ publicKey: smartContractAddress });
  let nullifierHash = await createNullifier(sender);
  console.log('NullifierHash', nullifierHash.toString());
  //Creatting deposit commitment
  let secret = Field.random();
  let commitment = await createCommitment(nullifierHash, secret);
  console.log('commitment', commitment.toString());
  await sendFundstoMixer({
    userPriKeyFirst: userAccount,
    feePayerPublicKey: sender,
    transactionFee,
    zkAppSmartContractTestAddress: smartContractAddress,
    amount,
  });
  //A note is created and send in a deposit event
  const note = {
    currency: 'Mina',
    amount: new UInt64(amount),
    nullifier: nullifierHash,
    secret: secret,
  };
  //Generating notestring
  const noteString = generateNoteString(note);
  //TODO:CHANGE
  let timeStamp = UInt64.fromFields([Field(0)]);
  //Emiting our deposit event
  await emitDepositEvent({
    userPriKeyFirst: userAccount,
    feePayerPublicKey: sender,
    transactionFee,
    contract,
    commitment,
    timeStamp,
  });
  //Emiting deposit action for updating IDs
  await emitDepositAction({
    userPriKeyFirst: userAccount,
    feePayerPublicKey: sender,
    transactionFee,
    contract,
  });
  console.log(`Note string ${noteString}`);
  const mintAmount = UInt64.from(1);
  const mintSignature = Signature.create(
    userAccount,
    mintAmount.toFields().concat(sender.toFields())
  );
  //Minting a token as a reward to the user
  await mintToken({
    userPriKeyFirst: userAccount,
    feePayerPublicKey: sender,
    transactionFee,
    contract,
    publicKeyTokenContract,
    recieverAddress: sender,
    signerPk: mintSignature,
  });
  return noteString;
}

// ------------------------------------
