# Mina-e2e testing

## Contracts

### MixerZkApp

1 - Recursion:

2 - Call stack composability: 
   Sending of mina tokens
   AccountUpdate creation for paying account creation fee

4 - Events:
5 - Preconditions (account):
6 - Preconditions (network):
GlobalSlot
7 - Permissions:
8 - Deploy SC:

Tests to implement:
 - X depositTimelocked ( + isTimed )
 - Not-permitted Transactions
 - Events correctly emitted

### Lending

2 - Call stack composability:

3 - Actions/Reducer: 
AddLiquidity - Rollup
Maybe Token operations? (Approvals? Would be easy)

4 - Events
5 - Preconditions (account):
6 - Preconditions (network):
9 - Tokens:

Tests to implement:
Events correctly emitted

## Surface Areas

1. Recursion
2. Call stack composability
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

We are planning on using a recursive version of our Minado past implementatio. We estimate this app can cover all Surface Areas. 


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
