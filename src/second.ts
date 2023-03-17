import {
  Field,
  SmartContract,
  method,
  Bool,
  state,
  State,
  isReady,
  Poseidon,
  Struct,
  Circuit,
  PublicKey,
  MerkleTree,
  PrivateKey,
  DeployArgs,
} from 'snarkyjs';

await isReady;

// let initialIndex: Field = new Field(0n);
//Initializing a Merkle Tree with height 3 for simplicity
// let minadoMerkleTree = new MerkleTree(3);

export class second extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
  }
  @method createNullifier(publicKey: PublicKey): Field {
    let keyString = publicKey.toFields();
    let secret = Field.random();
    if (secret.toString().trim().length !== 77) {
      secret = Field.random();
    }
    let nullifierHash = Poseidon.hash([...keyString, secret]);
    console.log('NULLFIERHASH', nullifierHash.toString());
    return nullifierHash;
  }
}
