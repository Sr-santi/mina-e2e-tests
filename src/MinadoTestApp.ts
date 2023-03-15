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

let initialIndex: Field = new Field(0n);
//Initializing a Merkle Tree with height 3 for simplicity
let minadoMerkleTree = new MerkleTree(3);


export class test extends SmartContract {
  @state(Field) test = State<Field>();
  // @state(Field) merkleTreeVariable = State<MerkleTree>();
  @state(Field) merkleTreeRoot = State<Field>();
  @state(Field) lastIndexAdded = State<Field>();
  //State variables offchain storage
  @state(PublicKey) storageServerPublicKey = State<PublicKey>();
  @state(Field) storageNumber = State<Field>();
  @state(Field) storageTreeRoot = State<Field>();
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
  @method update() {
    this.test.set(Field(0));
  }
  //Everytime a commitment is added to the deposit an event will be emited
  // @method updateMerkleTree(commitment: Field) {
  //   console.log('Updating the Merkle Tree .....');

  //   /**
  //    * Getting Merkle Tree State in the contract
  //    */
  //   let merkleTreeRoot = this.merkleTreeRoot.get();
  //   this.merkleTreeRoot.assertEquals(merkleTreeRoot);
  //   let lastIndex = this.lastIndexAdded.get();
  //   this.lastIndexAdded.assertEquals(lastIndex);
  //   let lastIndexFormated = lastIndex.toBigInt();
  //   console.log(
  //     'Index where the commitment will be inserted ',
  //     lastIndexFormated
  //   );

  //   //Modifying the Merkle Tree, inserting the commitment

  //   minadoMerkleTree.setLeaf(lastIndexFormated, commitment);
  //   let newMerkleTree = minadoMerkleTree;
  //   let newMerkleTreeRoot = newMerkleTree.getRoot();
  //   //Validating that the root is valid
  //   newMerkleTreeRoot.assertEquals(newMerkleTree.getRoot());

  //   //Updating the Merkle Tree root
  //   this.merkleTreeRoot.set(newMerkleTreeRoot);

  //   // Updating the index variable
  //   let newIndex = lastIndex.add(new Field(1));
  //   console.log('New index', newIndex.toBigInt());
  //   newIndex.assertEquals(lastIndex.add(new Field(1)));
  //   this.lastIndexAdded.set(newIndex);

  //   //Emiting a deposit event
  //   console.log('Emiting event.....');
  //   let deposit = {
  //     commitment: commitment,
  //     leafIndex: lastIndex,
  //     //TODO: CHANGE
  //     timeStamp: new Field(2),
  //   };
  //   this.emitEvent('deposit', deposit);
  //   console.log('=>>>>>>SEEEE EVENT EMITED');
  //   console.log(deposit);

  //   // this.emitNullifierEvent(Field(1))
  // }
}