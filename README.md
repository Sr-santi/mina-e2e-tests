# Mina-e2e testing

## Contracts

### MixerZkApp

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


## Surface Areas and how they are being tackled

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

# Notes

We are planning on using a recursive version of our Minado past implementation. We estimate this app can cover all Surface Areas. 


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
