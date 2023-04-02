import {
  Field,
  Experimental,
  Struct,
  Signature,
  PublicKey,
  UInt32,
  PrivateKey,
  isReady,
} from 'snarkyjs';
import { test } from './MinadoTestApp.js';
import { TokenContract } from './mint.js';

class ProgramInput extends Struct({
  signature: Signature,
  publicKey: PublicKey,
  permissionUntilBlockHeight: UInt32,
}) {}

const Program = Experimental.ZkProgram({
  publicInput: ProgramInput,

  methods: {
    run: {
      privateInputs: [],
      method(publicInput: ProgramInput) {
        // validate if the publicKey is associated with privatekey used to created the signature
        publicInput.signature
          .verify(publicInput.publicKey, Field(0).toFields())
          .assertTrue();
      },
    },
  },
});

const ProgramProof_ = Experimental.ZkProgram.Proof(Program);
class ProgramProof extends ProgramProof_ {}

const main = async () => {
  try {
    await isReady;
    await Program.compile();
    //await test.compile(); // here is the error
    // await TokenContract.compile();
    const tokenContractAddress =
      'B62qn3vM657WqhbgCtuxuxLjL6fSEkSu1CTJqSQA7uhcR9gc3uEKT1Z';
    const minadoPrivK = PrivateKey.fromBase58(
      'EKDxPsv3rnVvk8MVp7A5UNaL9pTVXnQkYdikuas3pHPHJyBCn4YC'
    );
    const publicKeyTokenContract = PublicKey.fromBase58(tokenContractAddress);
    const programInput = new ProgramInput({
      permissionUntilBlockHeight: UInt32.from(10_000),
      publicKey: publicKeyTokenContract,
      signature: Signature.create(minadoPrivK, Field(0).toFields()),
    });
    // creatign proof using zkprogram.
    console.log('Creating proof...');
    const proof = await Program.run(programInput);
  } catch (error) {
    console.log(error);
  }
};

main();

export { ProgramProof, Program, ProgramInput };
