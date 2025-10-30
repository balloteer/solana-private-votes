use sha3::{Digest, Keccak256};

/// Create a Pedersen-style commitment to a vote
///
/// Commitment = H(vote || blinding_factor)
///
/// This allows proving knowledge of a vote without revealing it
pub fn commit_vote(vote: u8, blinding_factor: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Keccak256::new();

    hasher.update(&[vote]);
    hasher.update(blinding_factor);

    let result = hasher.finalize();
    result.into()
}

/// Verify a vote commitment
pub fn verify_commitment(
    commitment: &[u8; 32],
    vote: u8,
    blinding_factor: &[u8; 32],
) -> bool {
    let computed = commit_vote(vote, blinding_factor);
    &computed == commitment
}

/// Create a commitment to encrypted vote data
pub fn commit_encrypted_vote(
    encrypted_vote: &[u8],
    randomness: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Keccak256::new();

    hasher.update(encrypted_vote);
    hasher.update(randomness);

    let result = hasher.finalize();
    result.into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commitment_deterministic() {
        let vote = 1u8;
        let blinding = [42u8; 32];

        let commitment1 = commit_vote(vote, &blinding);
        let commitment2 = commit_vote(vote, &blinding);

        assert_eq!(commitment1, commitment2);
    }

    #[test]
    fn test_commitment_different_votes() {
        let blinding = [42u8; 32];

        let commitment1 = commit_vote(0u8, &blinding);
        let commitment2 = commit_vote(1u8, &blinding);

        assert_ne!(commitment1, commitment2);
    }

    #[test]
    fn test_commitment_different_blinding() {
        let vote = 1u8;

        let commitment1 = commit_vote(vote, &[1u8; 32]);
        let commitment2 = commit_vote(vote, &[2u8; 32]);

        assert_ne!(commitment1, commitment2);
    }

    #[test]
    fn test_verify_commitment() {
        let vote = 3u8;
        let blinding = [123u8; 32];

        let commitment = commit_vote(vote, &blinding);

        assert!(verify_commitment(&commitment, vote, &blinding));
        assert!(!verify_commitment(&commitment, vote + 1, &blinding));
        assert!(!verify_commitment(&commitment, vote, &[124u8; 32]));
    }

    #[test]
    fn test_encrypted_vote_commitment() {
        let encrypted_data = vec![1, 2, 3, 4, 5];
        let randomness = [99u8; 32];

        let commitment1 = commit_encrypted_vote(&encrypted_data, &randomness);
        let commitment2 = commit_encrypted_vote(&encrypted_data, &randomness);

        assert_eq!(commitment1, commitment2);
    }
}
