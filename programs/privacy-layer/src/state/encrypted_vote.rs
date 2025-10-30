use anchor_lang::prelude::*;

/// Encrypted vote account
///
/// Stores an individual encrypted vote
#[account]
pub struct EncryptedVote {
    /// Bump seed for PDA
    pub bump: u8,

    /// The private election this vote belongs to
    pub election: Pubkey,

    /// The encrypted vote C1 component (32 bytes)
    pub ciphertext_c1: [u8; 32],

    /// The encrypted vote C2 component (32 bytes)
    pub ciphertext_c2: [u8; 32],

    /// Nullifier to prevent double voting (32 bytes)
    pub nullifier: [u8; 32],

    /// Commitment to the vote (32 bytes)
    pub commitment: [u8; 32],

    /// Timestamp when vote was cast
    pub timestamp: i64,
}

impl EncryptedVote {
    pub const LEN: usize = 8 + // discriminator
        1 + // bump
        32 + // election
        64 + // ciphertext (c1 + c2)
        32 + // nullifier
        32 + // commitment
        8; // timestamp
}
