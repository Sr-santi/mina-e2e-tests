import * as dotenv from 'dotenv';
dotenv.config();
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
  @state(UInt64) SUPPLY = State<UInt64>();
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
    // default supply is 1000
    this.SUPPLY.set(UInt64.from(1000));
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
    const SUPPLY0 = this.SUPPLY.get();
    this.SUPPLY.assertEquals(SUPPLY0);

    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);

    let newTotalAmountInCirculation = totalAmountInCirculation.add(amount);

    // check enough
    SUPPLY0.sub(totalAmountInCirculation).assertGreaterThanOrEqual(
      amount,
      'restAmount is enough for amount'
    );

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
    const SUPPLY0 = this.SUPPLY.get();
    this.SUPPLY.assertEquals(SUPPLY0);

    const totalAmountInCirculation0 = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation0);

    this.token.tokenOwner.x;
    this.token.burn({
      address: addressToDecrease,
      amount: amount,
    });

    // reduce the total amount in circulation and the supply
    this.SUPPLY.set(SUPPLY0.sub(amount));
    this.totalAmountInCirculation.set(totalAmountInCirculation0.sub(amount));
  }
}
