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
  Permissions,
  Signature,
  UInt32,
  AccountUpdate,
} from 'snarkyjs';
import { second } from './second.js';
import DepositClass from './models/DepositClass.js';
import { TokenContract } from './mint.js';
import { ProgramProof } from './zkProgram.js';
await isReady;

let initialIndex: Field = new Field(0n);
const mintAmount = UInt64.from(1);
const initialReward = UInt64.from(5);

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
  //@state(PublicKey) storageServerPublicKey = State<PublicKey>();
  @state(Field) storageNumber = State<Field>();
  @state(Field) storageTreeRoot = State<Field>();
  @state(Field) nullifierHash = State<Field>();
  @state(Field) depositId = State<Field>();

  @state(UInt64) rewardPerBlock = State<UInt64>();
  /**
   * by making this a `@method`, we ensure that a proof is created for the state initialization.
   * alternatively (and, more efficiently), we could have used `super.init()` inside `update()` below,
   * to ensure the entire state is overwritten.
   * however, it's good to have an example which tests the CLI's ability to handle init() decorated with `@method`.
   */
  @method init() {
    //TODO:When we add this all should failed as the proof is not authorized
    this.account.provedState.assertEquals(this.account.provedState.get());
    this.account.provedState.get().assertFalse();
    super.init();
    this.lastIndexAdded.set(initialIndex);
    let merkleRoot = minadoMerkleTree.getRoot();
    this.merkleTreeRoot.set(merkleRoot);
    //TODO: this is generating an error reward init
    this.rewardPerBlock.set(initialReward);
  }

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      setDelegate: Permissions.proof(),
      setPermissions: Permissions.proof(),
      setVerificationKey: Permissions.proof(),
      setZkappUri: Permissions.proof(),
      setTokenSymbol: Permissions.proof(),
      incrementNonce: Permissions.proof(),
      setVotingFor: Permissions.proof(),
      setTiming: Permissions.proof(),
    });
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
  //TODO: CHANGE SIGNATURE TYPE
  @method mintMinadoToken(
    tokenAddress: PublicKey,
    recieverAddress: PublicKey,
    signature: Signature
  ) {
    try {
      const mintContract = new TokenContract(tokenAddress);
      mintContract.mint(recieverAddress, mintAmount, signature);
    } catch (err) {
      console.log(err);
    }
  }
  @method emitNullifierEvent(nullifierHash: Field, sender: PublicKey) {
    //TODO: THIS FAILS
    // this.account.provedState.assertEquals(this.account.provedState.get());
    // this.account.isNew.assertEquals(this.account.isNew.get())
    // this.account.isNew.get().assertFalse
    //TODO:THIS FAILS

    // this.account.provedState.assertEquals(this.account.provedState.get());
    // this.account.provedState.get().assertFalse();
    // this.account.balance.assertBetween(UInt64.fromFields([Field(1)]),UInt64.fromFields([Field(50)]))
    // const account =  this.account.isNew.get()
    // try {
    //   const time = this.network.timestamp.get();
    //   console.log('account', time);
    //   this.emitEvent('nullifier', nullifierHash);
    //   // account.assertEquals(false)
    // } catch (err) {
    //   console.log(err);
    // }
    this.emitEvent('nullifier', nullifierHash);
  }
  @method verifyWithdrawTime() {
    //Network precondition
    const now = this.network.timestamp.get();
    this.network.timestamp.assertBetween(now, now.add(60 * 60 * 1000));
  }
  @method emitDepositEvent(commitment: Field, timeStamp: UInt64) {
    let deposit = {
      commitment: commitment,
      timeStamp: timeStamp,
    };
    this.emitEvent('deposit', deposit);
    this.approve;
  }

  @method updateRewardsPerBlock(
    // proof: ProgramProof,
    newRewardPerBlock: UInt64
  ) {
    // proof.verify();

    // const { permissionUntilBlockHeight } = proof.publicInput;
    const blockHeight = this.network.blockchainLength.get();
    this.network.blockchainLength.assertEquals(blockHeight);

    const rewardPerBlock = this.rewardPerBlock.get();
    this.rewardPerBlock.assertEquals(rewardPerBlock);
    this.rewardPerBlock.set(newRewardPerBlock);
  }

  @method approveAccountUpdate(accountUpdate: AccountUpdate) {
    this.approve(accountUpdate, AccountUpdate.Layout.AnyChildren);
  }
}
