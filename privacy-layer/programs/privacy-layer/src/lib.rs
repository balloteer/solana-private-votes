use anchor_lang::prelude::*;

declare_id!("APdSGnQuogNbYga3CZUZfSRpAz4agdufXbEPbGCCt9by");

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::*;
use errors::*;

#[program]
pub mod privacy_layer {
    use super::*;

    /// Initialize a new private election
    ///
    /// Creates a private election with ElGamal encryption for vote privacy
    pub fn initialize_private_election(
        ctx: Context<InitializePrivateElection>,
        election_id: [u8; 32],
        mpc_public_key: [u8; 32],
        voter_merkle_root: [u8; 32],
        ends_at: i64,
        num_options: u8,
    ) -> Result<()> {
        instructions::initialize_private_election::handler(
            ctx,
            election_id,
            mpc_public_key,
            voter_merkle_root,
            ends_at,
            num_options,
        )
    }

    /// Cast an encrypted vote
    ///
    /// Allows an eligible voter to cast an encrypted vote with ZK proof
    pub fn cast_encrypted_vote(
        ctx: Context<CastEncryptedVote>,
        ciphertext_c1: [u8; 32],
        ciphertext_c2: [u8; 32],
        nullifier: [u8; 32],
        commitment: [u8; 32],
        zk_proof_a: Option<[u8; 32]>,
        zk_proof_b: Option<[u8; 64]>,
        zk_proof_c: Option<[u8; 32]>,
    ) -> Result<()> {
        instructions::cast_encrypted_vote::handler(
            ctx,
            ciphertext_c1,
            ciphertext_c2,
            nullifier,
            commitment,
            zk_proof_a,
            zk_proof_b,
            zk_proof_c,
        )
    }
}
