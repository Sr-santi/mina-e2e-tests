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
import { makeAndSendTransaction } from './utils.js';
import { Program, ProgramInput } from './zkProgram.js';
await isReady;
///Setup
const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS || '';

//Variables
let publicKeyTokenContract: PublicKey;
let zkTokenContract: TokenContract;

// -------------------------------------------

beforeAll(async () => {
  publicKeyTokenContract = PublicKey.fromBase58(tokenContractAddress);
  zkTokenContract = new TokenContract(publicKeyTokenContract);
});

describe('Minado E2E tests', () => {
  let Blockchain;
  let minadoPk: any;
  let minadoPrivK: PrivateKey;
  let instance: any;

  //   beforeAll(async () => {
  //     const isBerkeley = process.env.TEST_NETWORK === 'true';

  //     // Mina Blockchain instance : local | berkeley
  //     if (isBerkeley) {
  //       Blockchain = Mina.Network({
  //         mina: 'https://proxy.berkeley.minaexplorer.com/graphql',
  //         archive: 'https://archive-node-api.p42.xyz/',
  //       });
  //       minadoPrivK = PrivateKey.fromBase58(
  //         'EKDxPsv3rnVvk8MVp7A5UNaL9pTVXnQkYdikuas3pHPHJyBCn4YC'
  //       );
  //       minadoPk = PublicKey.fromBase58(
  //         'B62qn3vM657WqhbgCtuxuxLjL6fSEkSu1CTJqSQA7uhcR9gc3uEKT1Z'
  //       );
  //       console.log('On Berkley ready');
  //       Mina.setActiveInstance(Blockchain);
  //     } else {
  //       instance = Mina.LocalBlockchain();
  //       minadoPrivK = instance.testAccounts[0].privateKey;
  //       minadoPk = minadoPrivK.toPublicKey();
  //       Mina.setActiveInstance(instance);
  //     }
  //     // compile contracts
  //     await TokenContract.compile();
  //     await zkTokenContract.init();
  //   });

  //   afterAll(() => {
  //     setInterval(shutdown, 0);
  //   });

  async function getAccount() {
    await fetchAccount({
      publicKey: tokenContractAddress,
    });
  }

  // ------------------------------------

  /* it(
    'mint token, it should succesfully mint a token and deposit it',
    async () => {
      console.time('TokenTest_mint_token');
      try {
        const mintAmount = UInt64.from(1);
        const mintSignature = Signature.create(
          minadoPrivK,
          mintAmount.toFields().concat(publicKeyTokenContract.toFields())
        );
        makeAndSendTransaction({
          feePayerPublicKey: minadoPk,
          mutateZkApp: () => {
            zkTokenContract.mint(
              publicKeyTokenContract,
              minadoPk,
              mintSignature
            );
          },
          transactionFee: 200_000_000,
          signTx(tx: Mina.Transaction) {
            tx.sign([minadoPrivK]);
          },
        });
        console.timeEnd('TokenTest_mint_token');
      } catch (error: any) {
        console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
        console.timeEnd('TokenTest_mint_token');
        throw error;
      }
    },
    5 * 60 * 1000
  ); */

  /*   it(
    'send token, it should succesfully send a token and deposit it',
    async () => {
      const account1PublicKey =
        'B62qkb9CahXa5dWkQjUVqxZxPLgRuawah6Y66pwTW2CxpxB54auJp2P';
      makeAndSendTransaction({
        feePayerPublicKey: minadoPk,
        mutateZkApp: () => {
          zkTokenContract.sendTokens(
            PublicKey.fromBase58(tokenContractAddress),
            PublicKey.fromBase58(account1PublicKey),
            UInt64.from(1)
          );
        },
        transactionFee: 300_000_000,
        signTx(tx: Mina.Transaction) {
          tx.sign([minadoPrivK]);
        },
      });
      console.time('TokenTest_send_token');
      try {
        console.timeEnd('TokenTest_send_token');
      } catch (error: any) {
        console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
        console.timeEnd('TokenTest_send_token');
        throw error;
      }
    },
    5 * 60 * 1000
  ); */

  /* it(
    'amount > SUPPLY, it should fail to mint this amount of tokens',
    async () => {
      console.time('TokenTest_send_token');
      try {
        // the maximum SUPPLY is 1000
        const mintAmount = UInt64.from(100000); // 100k
        const mintSignature = Signature.create(
          minadoPrivK,
          mintAmount.toFields().concat(publicKeyTokenContract.toFields())
        );
        makeAndSendTransaction({
          feePayerPublicKey: minadoPk,
          mutateZkApp: () => {
            zkTokenContract.mint(
              publicKeyTokenContract,
              minadoPk,
              mintSignature
            );
          },
          transactionFee: 200_000_000,
          signTx(tx: Mina.Transaction) {
            tx.sign([minadoPrivK]);
          },
        });
        console.timeEnd('TokenTest_send_token');
      } catch (error: any) {
        console.log(
          'This is the error when mint more tokens that you want!!!!: ',
          error
        );
        console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
        console.timeEnd('TokenTest_send_token');
        throw error;
      }
    },
    5 * 60 * 1000
  ); */
  /* it(
    'check init contract state',
    async () => {
      console.time('TokenTest_send_token');
      try {
        getAccount();
        const SUPPLY0 = zkTokenContract.SUPPLY.get();
        zkTokenContract.SUPPLY.assertEquals(SUPPLY0);

        const totalAmountInCirculation =
          zkTokenContract.totalAmountInCirculation.get();
        zkTokenContract.totalAmountInCirculation.assertEquals(
          totalAmountInCirculation
        );
        zkTokenContract.tokenId;
        console.timeEnd('TokenTest_send_token');
      } catch (error: any) {
        console.log(
          'This is the error when mint more tokens that you want!!!!: ',
          error
        );
        console.error(JSON.stringify(error?.response?.data?.errors, null, 2));
        console.timeEnd('TokenTest_send_token');
        throw error;
      }
    },
    5 * 60 * 1000
  ); */
  it.todo(
    'Errors related to the token contract, zkapp account in the ledger, `await fetchAccount(zkappAddress)` no works'
  );
});
