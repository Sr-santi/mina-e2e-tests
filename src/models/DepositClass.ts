import {
    CircuitValue,
    Field,
    Poseidon,
    prop,
    PublicKey,
    Signature,
    UInt64,
  } from 'snarkyjs';
  import { MerkleTree } from 'snarkyjs/dist/node/lib/merkle_tree';
  export default class DepositClass extends CircuitValue {
    @prop commitment: Field;
    @prop timeStamp: UInt64;
  
    constructor(commitment: Field, timeStamp: UInt64) {
      super(commitment, timeStamp);
      this.commitment = commitment;
      this.timeStamp = timeStamp;
    }
    toFieldsCommitment(): Field[] {
      return this.commitment.toFields();
    }
  }
  