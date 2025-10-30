import { Connection, PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { EncryptedVoteData, PrivateElectionConfig, VoterSecret } from "./types";
import { prepareVoteData } from "./crypto";
import { computeNullifier } from "./nullifier";

/**
 * Privacy Layer SDK Client
 *
 * High-level interface for interacting with the privacy layer program
 */
export class PrivacyLayerClient {
  constructor(
    public program: Program,
    public connection: Connection,
    public provider: AnchorProvider
  ) {}

  /**
   * Get the privacy layer program ID
   */
  get programId(): PublicKey {
    return this.program.programId;
  }

  /**
   * Find the private election PDA
   */
  async findPrivateElectionPda(electionPubkey: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("private_election"), electionPubkey.toBuffer()],
      this.programId
    );
  }

  /**
   * Find the nullifier set PDA
   */
  async findNullifierSetPda(electionPubkey: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier_set"), electionPubkey.toBuffer()],
      this.programId
    );
  }

  /**
   * Find the encrypted vote PDA
   */
  async findEncryptedVotePda(
    privateElectionPubkey: PublicKey,
    nullifier: Uint8Array
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("encrypted_vote"), privateElectionPubkey.toBuffer(), Buffer.from(nullifier)],
      this.programId
    );
  }

  /**
   * Initialize a new private election
   */
  async initializePrivateElection(
    election: PublicKey,
    config: PrivateElectionConfig
  ): Promise<PublicKey> {
    const [privateElection] = await this.findPrivateElectionPda(election);
    const [nullifierSet] = await this.findNullifierSetPda(election);

    await this.program.methods
      .initializePrivateElection(
        Array.from(config.electionId),
        Array.from(config.mpcPublicKey),
        Array.from(config.voterMerkleRoot),
        new BN(config.endsAt),
        config.numOptions
      )
      .accounts({
        privateElection,
        nullifierSet,
        election,
        authority: this.provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return privateElection;
  }

  /**
   * Cast an encrypted vote
   */
  async castEncryptedVote(
    privateElection: PublicKey,
    voteData: EncryptedVoteData
  ): Promise<string> {
    const election = await this.program.account.privateElection.fetch(privateElection);
    const [nullifierSet] = await this.findNullifierSetPda(election.election);
    const [encryptedVote] = await this.findEncryptedVotePda(
      privateElection,
      voteData.nullifier
    );

    const zkProofA = voteData.zkProof?.a ? Array.from(voteData.zkProof.a) : null;
    const zkProofB = voteData.zkProof?.b ? Array.from(voteData.zkProof.b) : null;
    const zkProofC = voteData.zkProof?.c ? Array.from(voteData.zkProof.c) : null;

    const signature = await this.program.methods
      .castEncryptedVote(
        Array.from(voteData.ciphertext.c1),
        Array.from(voteData.ciphertext.c2),
        Array.from(voteData.nullifier),
        Array.from(voteData.commitment),
        zkProofA,
        zkProofB,
        zkProofC
      )
      .accounts({
        privateElection,
        encryptedVote,
        nullifierSet,
        voter: this.provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Prepare and cast a vote (convenience method)
   *
   * This combines vote preparation and submission
   */
  async prepareAndCastVote(
    privateElection: PublicKey,
    vote: number,
    voterSecret: VoterSecret
  ): Promise<string> {
    // Fetch election data
    const electionData = await this.program.account.privateElection.fetch(privateElection);

    // Prepare vote data
    const voteData = prepareVoteData(
      vote,
      new Uint8Array(electionData.mpcPublicKey),
      voterSecret,
      new Uint8Array(electionData.electionId)
    );

    // Cast the vote
    return this.castEncryptedVote(privateElection, {
      ciphertext: voteData.ciphertext,
      nullifier: voteData.nullifier,
      commitment: voteData.commitment,
    });
  }

  /**
   * Get private election data
   */
  async getPrivateElection(privateElection: PublicKey): Promise<any> {
    return this.program.account.privateElection.fetch(privateElection);
  }

  /**
   * Get all encrypted votes for an election
   */
  async getEncryptedVotes(privateElection: PublicKey): Promise<any[]> {
    return this.program.account.encryptedVote.all([
      {
        memcmp: {
          offset: 8 + 1, // discriminator + bump
          bytes: privateElection.toBase58(),
        },
      },
    ]);
  }

  /**
   * Check if a nullifier has been used
   */
  async isNullifierUsed(
    election: PublicKey,
    nullifier: Uint8Array
  ): Promise<boolean> {
    const [nullifierSet] = await this.findNullifierSetPda(election);
    const nullifierSetData = await this.program.account.nullifierSet.fetch(nullifierSet);

    // Check if nullifier exists in the set
    for (const usedNullifier of nullifierSetData.nullifiers) {
      const match = usedNullifier.every((byte: number, index: number) => byte === nullifier[index]);
      if (match) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Create a Privacy Layer SDK client
 */
export function createPrivacyLayerClient(
  program: Program,
  connection: Connection,
  provider: AnchorProvider
): PrivacyLayerClient {
  return new PrivacyLayerClient(program, connection, provider);
}
