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
### Want to learn more? 
Read more here (https://github.com/Sr-santi/CLI-for-Private-Solutions-using-ZK-proofs)




## Surface Areas and how they are being covered

1. Recursion
2. Call stack composability
    It is being used when creating a deposit object, we have two smart contract an operations Smart Contract
    and Minado Smart contract, every time we need to perform and operation we call the operation smart contract. A clear example is the createDeposit() that lives in the Minado Smart Contract, where we are using the createNullifier() method from the ops Smart Contract
3. Actions
4. Events
5. Pre-conditions (account)
6. Pre-conditions (network)
7. Permissions
   - URI
   - Set Token Symbol
   - Set Timing
   - Set Voting For
   - Set Delegate
8. Deploy Smart Contract
9. Tokens

## How to deploy our zkApp(s)

## Public and verification key that was used 
Public Key: B62qn3vM657WqhbgCtuxuxLjL6fSEkSu1CTJqSQA7uhcR9gc3uEKT1Z
# Notes

Please feel free to reach out with feedback to ()

## TODO LIST
1 - Recursion NOT DONE
2 - Call stack composability:  HALF DONE
3. Actions: DONE WITH SOME BUGS 
4 - Events: DONE 
5 - Preconditions (account):DONE  WITH BUGS
6 - Preconditions (network): NOT DONE 
GlobalSlot
7 - Permissions: NOT DONE 
8 - Deploy SC: DONE
9 - TOKENS :NOT DONE


## Usage

### How to build

```sh
npm run build
```

### How to run tests

```sh
npm run test
npm run testw # watch mode
```

### How to run coverage

```sh
npm run coverage
```

### License

[Apache-2.0](LICENSE)
