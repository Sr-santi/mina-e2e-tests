import {
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  UInt64,
  PublicKey,
  Signature,
  isReady,
} from 'snarkyjs';

const tokenSymbol = 'MINTKN';
await isReady;

export class TokenContract extends SmartContract {
  @state(UInt64) totalAmountInCirculation = State<UInt64>();
/**
 * Deploy function
 * @param args  verification key
 */
  deploy(args: DeployArgs) {
    super.deploy(args);

    const permissionToEdit = Permissions.proof();

    this.account.permissions.set({
      ...Permissions.default(),
      editState: permissionToEdit,
      setTokenSymbol: permissionToEdit,
      send: permissionToEdit,
      receive: permissionToEdit,
    });
  }
/**
 * init function, it gets the tokenSymbol and set the ammount in circulation in zero
 */
  @method init() {
    super.init();
    this.account.tokenSymbol.set(tokenSymbol);
    this.totalAmountInCirculation.set(UInt64.zero);
  }
  /**
   * Mint token function
   * @param receiverAddress 
   * @param amount 
   * @param adminSignature 
   */

  @method mint(
    receiverAddress: PublicKey,
    amount: UInt64,
    adminSignature: Signature
  ) {
    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);

    let newTotalAmountInCirculation = totalAmountInCirculation.add(amount);

    this.token.mint({
      address: receiverAddress,
      amount,
    });

    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }
  /**
   * Send tokens from one account to another
   * @param senderAddress 
   * @param receiverAddress 
   * @param amount 
   */
  @method sendTokens(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: UInt64
  ) {
    this.token.send({
      from: senderAddress,
      to: receiverAddress,
      amount,
    });
  }
  /**
   * Burns tokens
   * @param addressToDecrease 
   * @param amount 
   */
  @method burn(addressToDecrease: PublicKey, amount: UInt64) {
    this.token.tokenOwner.x;
    this.token.burn({
      address: addressToDecrease,
      amount: amount,
    });
  }
}
