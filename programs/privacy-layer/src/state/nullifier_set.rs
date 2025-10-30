use anchor_lang::prelude::*;

/// Nullifier set account
///
/// Stores used nullifiers to prevent double voting
/// Uses a simple vec approach for MVP (can be optimized with bitmap later)
#[account]
pub struct NullifierSet {
    /// Bump seed for PDA
    pub bump: u8,

    /// The private election this set belongs to
    pub election: Pubkey,

    /// List of used nullifiers (grows dynamically)
    /// For production: consider using a more efficient structure like a bitmap or merkle tree
    pub nullifiers: Vec<[u8; 32]>,
}

impl NullifierSet {
    /// Initial size (empty vec)
    pub const INIT_LEN: usize = 8 + // discriminator
        1 + // bump
        32 + // election
        4; // vec length prefix

    /// Check if a nullifier has been used
    pub fn contains(&self, nullifier: &[u8; 32]) -> bool {
        self.nullifiers.iter().any(|n| n == nullifier)
    }

    /// Add a nullifier to the set
    pub fn insert(&mut self, nullifier: [u8; 32]) -> Result<()> {
        if self.contains(&nullifier) {
            return err!(ErrorCode::NullifierAlreadyUsed);
        }
        self.nullifiers.push(nullifier);
        Ok(())
    }

    /// Get the number of nullifiers
    pub fn len(&self) -> usize {
        self.nullifiers.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.nullifiers.is_empty()
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("This nullifier has already been used - double voting not allowed")]
    NullifierAlreadyUsed,
}
