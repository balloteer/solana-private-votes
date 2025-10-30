use anchor_lang::prelude::*;

/// Private election state account
///
/// This account stores the configuration and state of a private election
#[account]
pub struct PrivateElection {
    /// Bump seed for PDA
    pub bump: u8,

    /// Authority that can manage the election
    pub authority: Pubkey,

    /// Reference to the public election in mpl-gov-micro
    pub election: Pubkey,

    /// ElGamal public key for encrypting votes (32 bytes)
    pub mpc_public_key: [u8; 32],

    /// Root of the voter merkle tree for ZK proofs
    pub voter_merkle_root: [u8; 32],

    /// Election identifier for nullifier computation
    pub election_id: [u8; 32],

    /// Total number of encrypted votes cast
    pub total_encrypted_votes: u64,

    /// Whether tally has been requested from MPC network
    pub tally_requested: bool,

    /// Whether the tally has been finalized
    pub tally_finalized: bool,

    /// Timestamp when election was created
    pub created_at: i64,

    /// Timestamp when election ends
    pub ends_at: i64,

    /// Number of vote options
    pub num_options: u8,

    /// Status of the election
    pub status: ElectionStatus,
}

impl PrivateElection {
    pub const LEN: usize = 8 + // discriminator
        1 + // bump
        32 + // authority
        32 + // election
        32 + // mpc_public_key
        32 + // voter_merkle_root
        32 + // election_id
        8 + // total_encrypted_votes
        1 + // tally_requested
        1 + // tally_finalized
        8 + // created_at
        8 + // ends_at
        1 + // num_options
        1; // status
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ElectionStatus {
    /// Election is being set up
    Pending,
    /// Election is active and accepting votes
    Active,
    /// Election has ended, awaiting tally
    Ended,
    /// Election is finalized with results
    Finalized,
}
