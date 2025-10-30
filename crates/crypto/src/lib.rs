//! Cryptographic primitives for privacy layer voting
//!
//! This library provides:
//! - ElGamal encryption and decryption
//! - Homomorphic addition operations
//! - Nullifier generation
//! - Vote commitments

#![cfg_attr(not(test), no_std)]

extern crate alloc;

pub mod elgamal;
pub mod nullifier;
pub mod commitment;
pub mod errors;

// Re-exports
pub use elgamal::{ElGamalKeypair, ElGamalPublicKey, ElGamalSecretKey, ElGamalCiphertext};
pub use nullifier::compute_nullifier;
pub use commitment::commit_vote;
pub use errors::CryptoError;

/// Result type for crypto operations
pub type Result<T> = core::result::Result<T, CryptoError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_library_loads() {
        // Basic sanity check
        assert!(true);
    }
}
