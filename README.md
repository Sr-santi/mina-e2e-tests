# Mina-e2e testing

## Contracts

## My application and what it does?

Our application is a shorter and simpler version of Minado, here we explain what Minado does👇🏻👇🏻

### Minado🔒: Zk Privacy Solution on Mina Protocol

### What did we build? 👷🏻‍♀️🚀

We build a Mixer Protocol in Mina, the high-level idea is to allow private transactions for Mina, which we believe is necessary for building a fully private and secure ecosystem.

### Why a Mixer? 🤔

As ZkBuilders we believe that the future should not be one where you lose control over your data. Also, we build this protocol recognizing that security and privacy should not be hard for the end-user.
We envision a world where people can control their data in a smooth and low-effort way.

### How does it work?👇🏻🧑🏻‍💻

The protocol is divided into 2 parts

## -Deposit logic:

We have 2 smart contracts our Test smart contract that handles all the logic for deposit and withdraws and our Token smart contract that manages all the logic for Token ops.

In the deposit, the following actions are executed.

1. A Minado account that will pay the gas fees is funded

2. A commitment needs to be created C(0) = H(S(0),N(0))

   Note: S= Secret , N= Nullifier ( N(0) = Hash(PB(user),Random private key ))

   3.1 A Secret is created using Poseidon ( Cryptography library in Snarky )

   3.2 A Nullifier is created to avoid double spending

   3.3 The Secret and the Nullifier are hashed and the commitment is created.

3. The commitment is added to the deposit event and the Deposit event is emmited.

4. A note which we can understand as a Zk-proof of the commitment is provided to the user to store it.
5. Funds are sent from the user account to the minadoZkAppAccount
6. We reward our users with 1 MINTK.

## -Validation and Withdraw (Circuit)

1. The user provides the note.

2. With the note we reconstruct the commitment and verify that is correct based on the deposit event.

3. We verify that the note has not been spent using the Nullifier and checking the Nullifier Events.

4. If everything is correct withdrawand emit a nullifier event.

### Want to learn more?

Read more here (https://github.com/Sr-santi/CLI-for-Private-Solutions-using-ZK-proofs)

## Surface Areas and how they are being covered

# 1. Recursion

We used recursion to verify a Signature in a SM method that we use to validate that the rewards given after someone deposited were distributed correctly.

# 2. Call stack composability

We used Call-stack composability to mint a token from our Mint contract, we added a method to our main MinadoTestApp contract called mintMinadoToken() this method initializes the token contract and calls the mint fuction from it.

# 3. Actions

We use actions to update the ID of deposit, as we track the IDs and number of deposits in our contract we needed a way to do it programmtically we use it in our updateIdOfDeposit method.

# 4. Events

We use events for 2 things, emmiting a deposit event that will be verified at the moment of withdraw and emiiting a nullifier event to avoid double spending.

# 5. Pre-conditions (account)

We use Pre-conditions to verify that an account has enough balance to deposit

# 6. Pre-conditions (network)

We use network Pre-conditions in our withdraw function,withdraws cannot be done before an hour of deposit, this is because we need to wait for transaction times to be completed before allowing something to withdraw, this allows us to be protected from corrupted withdraws.

# 7. Permissions

- URI
- Set Token Symbol
- Set Timing
- Set Voting For
- Set Delegate
  We use Permission for both of our contracts MinadoTestApp and our TokenContract this is extremly important to avoid changes on the state of our app, avoiding malicious user sending or recieving tokens, also changing the nonce and other potential problems.

# 8. Deploy Smart Contract

We deployed both of our smart contracts to Berkley

# 9. Tokens

We use all the cool features for customized tokens in our Token contract😎.

## How to deploy our zkApp(s)

# To deploy our contracts just run

```sh
npm run deploy
```

And change the lines 43 and 50 depending on which smart contract you want to deploy, you have to options our test smart contract (which contains all the logic for deposit and withdraws) and our Token smart contract (which contains all the logic for Tokes).

At snarkyjs@0.9.8 deploys are not working we are checking what is the problem, however with versions before that one everything is working as expected.

## Public and verification key that was used

Public Key: B62qn3vM657WqhbgCtuxuxLjL6fSEkSu1CTJqSQA7uhcR9gc3uEKT1Z
VERFICATION KEY: EKDxPsv3rnVvk8MVp7A5UNaL9pTVXnQkYdikuas3pHPHJyBCn4YC

## Estimated times

# Notes

Please feel free to reach out with feedback to ()

## Usage

### How to build

```sh
npm run build
```

### How to run tests

PLEASE RUN THESE TESTS USING SNARKYJS@0,9,8

```sh
npm run test
npm run testw # watch mode
```

## Estimated times

createDepositTest: 186731 ms === 186.7s
createCommitmentTest: 47 ms === 0.047s
validatingDepositExistTest: 9 ms === 0.009s
claimTokensTest: 212257 ms === 212.257s

### License

[Apache-2.0](LICENSE)
