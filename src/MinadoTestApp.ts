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
  Reducer,
  UInt64,
} from 'snarkyjs';
import { second } from './second.js';
import DepositClass from './models/DepositClass.js';

await isReady;

let initialIndex: Field = new Field(0n);
//Initializing a Merkle Tree with height 3 for simplicity
let minadoMerkleTree = new MerkleTree(3);

export class test extends SmartContract {
  events = {
    nullifier: Field,
    depositIdUpdated: Field,
    deposit: DepositClass,
  };
  //Actions
  reducer = Reducer({ actionType: Field });
  // @state(Field) merkleTreeVariable = State<MerkleTree>();
  @state(Field) merkleTreeRoot = State<Field>();
  @state(Field) lastIndexAdded = State<Field>();
  //State variables offchain storage
  @state(PublicKey) storageServerPublicKey = State<PublicKey>();
  @state(Field) storageNumber = State<Field>();
  @state(Field) storageTreeRoot = State<Field>();
  @state(Field) nullifierHash = State<Field>();
  @state(Field) depositId = State<Field>();
  /**
   * by making this a `@method`, we ensure that a proof is created for the state initialization.
   * alternatively (and, more efficiently), we could have used `super.init()` inside `update()` below,
   * to ensure the entire state is overwritten.
   * however, it's good to have an example which tests the CLI's ability to handle init() decorated with `@method`.
   */
  @method init() {
    super.init();
    this.lastIndexAdded.set(initialIndex);
    let merkleRoot = minadoMerkleTree.getRoot();
    this.merkleTreeRoot.set(merkleRoot);
  }

  deploy(args: DeployArgs) {
    super.deploy(args);
  }
  // @method update() {
  //   this.des.set(Field(0));
  // }
  @method updateIdOfDeposit() {
    let increment = Field(1);
    let currentDepositId = this.depositId.get();
    this.depositId.assertEquals(currentDepositId);
    let newDepositId = currentDepositId.add(increment);
    this.depositId.set(newDepositId);
    this.emitEvent('depositIdUpdated', newDepositId);
    this.reducer.dispatch(increment);
    // return newDepositId;
  }
  @method manageDeposit(userPublicKey: PublicKey, address: PublicKey) {
    //Publick Key of the Ssecond Smart contract
    let opsContract = new second(address);
    // console.log(opsContract)
    let nullifierHash = opsContract.createNullifier(userPublicKey);
    return nullifierHash;
  }
  @method emitNullifierEvent(nullifierHash: Field, sender: PublicKey) {
    // this.account.balance.assertBetween(UInt64.fromFields([Field(1)]),UInt64.fromFields([Field(50)]))
    this.emitEvent('nullifier', nullifierHash);
  }
  @method emitDepositEvent(commitment: Field, timeStamp: UInt64) {
    let deposit = {
      commitment: commitment,
      timeStamp: timeStamp,
    };
    this.emitEvent('deposit', deposit);
  }
}
