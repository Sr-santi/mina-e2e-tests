import {
  Field,
  SmartContract,
  method,
  state,
  State,
  isReady,
  PublicKey,
  MerkleTree,
  DeployArgs,
  UInt64,
  Permissions,
  Signature,
  AccountUpdate,
  Reducer,
} from 'snarkyjs';
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
  @state(Field) merkleTreeRoot = State<Field>();
  @state(Field) lastIndexAdded = State<Field>();
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
  /**
   * Function to create the deploy for the contract, and assign permissions to the account
   * @param args DeployArgs object with the account to deploy the contract
   */
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
  /**
   * Function to update the state of the depositId variable
   */
  @method updateIdOfDeposit() {
    let increment = Field(1);
    let currentDepositId = this.depositId.get();
    this.depositId.assertEquals(currentDepositId);
    let newDepositId = currentDepositId.add(increment);
    this.depositId.set(newDepositId);
    this.emitEvent('depositIdUpdated', newDepositId);
    this.reducer.dispatch(increment);
  }
  /**
   * Function mint the MINTKN token
   */
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
  /**
   * Function to emit the nullifier event associated with the deposit
   */
  @method emitNullifierEvent(nullifierHash: Field, sender: PublicKey) {
    //TODO: pre-account conditions
    this.emitEvent('nullifier', nullifierHash);
  }
  /**
   * Function to check the time precondition for the withdraw
   */
  @method verifyWithdrawTime() {
    //Network precondition
    const now = this.network.timestamp.get();
    this.network.timestamp.assertBetween(now, now.add(60 * 60 * 1000));
  }
  /**
   * Function to emit the deposit event
   */
  @method emitDepositEvent(commitment: Field, timeStamp: UInt64) {
    let deposit = {
      commitment: commitment,
      timeStamp: timeStamp,
    };
    this.emitEvent('deposit', deposit);
    this.approve;
  }
  /**
   * Function to update the rewardPerBlock and validate the proof associated with the update inside a ZK program
   */
  @method updateRewardsPerBlock(
    proof: ProgramProof,
    newRewardPerBlock: UInt64
  ) {
    proof.verify();

    const { permissionUntilBlockHeight } = proof.publicInput;
    const blockHeight = this.network.blockchainLength.get();
    this.network.blockchainLength.assertEquals(blockHeight);

    const rewardPerBlock = this.rewardPerBlock.get();
    this.rewardPerBlock.assertEquals(rewardPerBlock);
    this.rewardPerBlock.set(newRewardPerBlock);
  }
  /**
   * Function to approve the change of the account state
   */
  @method approveAccountUpdate(accountUpdate: AccountUpdate) {
    this.approve(accountUpdate, AccountUpdate.Layout.AnyChildren);
  }
}
