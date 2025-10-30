use sha3::{Digest, Keccak256};

/// Compute a nullifier for vote uniqueness
///
/// Nullifier = H(voter_secret || election_id || nonce)
///
/// This ensures:
/// - Same voter + same election = same nullifier (prevents double voting)
/// - Different elections = different nullifiers (can vote in multiple elections)
/// - Nonce adds optional entropy if needed
pub fn compute_nullifier(
    voter_secret: &[u8; 32],
    election_id: &[u8; 32],
    nonce: u64,
) -> [u8; 32] {
    let mut hasher = Keccak256::new();

    // Hash all inputs together
    hasher.update(voter_secret);
    hasher.update(election_id);
    hasher.update(nonce.to_le_bytes());

    let result = hasher.finalize();
    result.into()
}

/// Compute a nullifier using a pubkey as election ID
pub fn compute_nullifier_with_pubkey(
    voter_secret: &[u8; 32],
    election_pubkey: &[u8; 32],
    nonce: u64,
) -> [u8; 32] {
    compute_nullifier(voter_secret, election_pubkey, nonce)
}

/// Verify that a nullifier was generated correctly (for testing)
pub fn verify_nullifier(
    nullifier: &[u8; 32],
    voter_secret: &[u8; 32],
    election_id: &[u8; 32],
    nonce: u64,
) -> bool {
    let computed = compute_nullifier(voter_secret, election_id, nonce);
    &computed == nullifier
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nullifier_deterministic() {
        let voter_secret = [1u8; 32];
        let election_id = [2u8; 32];
        let nonce = 0u64;

        let nullifier1 = compute_nullifier(&voter_secret, &election_id, nonce);
        let nullifier2 = compute_nullifier(&voter_secret, &election_id, nonce);

        assert_eq!(nullifier1, nullifier2);
    }

    #[test]
    fn test_nullifier_different_voters() {
        let voter1_secret = [1u8; 32];
        let voter2_secret = [2u8; 32];
        let election_id = [3u8; 32];
        let nonce = 0u64;

        let nullifier1 = compute_nullifier(&voter1_secret, &election_id, nonce);
        let nullifier2 = compute_nullifier(&voter2_secret, &election_id, nonce);

        assert_ne!(nullifier1, nullifier2);
    }

    #[test]
    fn test_nullifier_different_elections() {
        let voter_secret = [1u8; 32];
        let election1_id = [2u8; 32];
        let election2_id = [3u8; 32];
        let nonce = 0u64;

        let nullifier1 = compute_nullifier(&voter_secret, &election1_id, nonce);
        let nullifier2 = compute_nullifier(&voter_secret, &election2_id, nonce);

        assert_ne!(nullifier1, nullifier2);
    }

    #[test]
    fn test_nullifier_different_nonce() {
        let voter_secret = [1u8; 32];
        let election_id = [2u8; 32];

        let nullifier1 = compute_nullifier(&voter_secret, &election_id, 0);
        let nullifier2 = compute_nullifier(&voter_secret, &election_id, 1);

        assert_ne!(nullifier1, nullifier2);
    }

    #[test]
    fn test_verify_nullifier() {
        let voter_secret = [1u8; 32];
        let election_id = [2u8; 32];
        let nonce = 42u64;

        let nullifier = compute_nullifier(&voter_secret, &election_id, nonce);

        assert!(verify_nullifier(&nullifier, &voter_secret, &election_id, nonce));
        assert!(!verify_nullifier(&nullifier, &voter_secret, &election_id, nonce + 1));
    }
}
