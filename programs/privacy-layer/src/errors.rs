use anchor_lang::prelude::*;

#[error_code]
pub enum PrivacyError {
    #[msg("Invalid ElGamal public key")]
    InvalidPublicKey,

    #[msg("Invalid ElGamal ciphertext")]
    InvalidCiphertext,

    #[msg("Nullifier already used - double voting not allowed")]
    NullifierAlreadyUsed,

    #[msg("Invalid zero-knowledge proof")]
    InvalidZkProof,

    #[msg("Invalid voter merkle proof")]
    InvalidMerkleProof,

    #[msg("Election is not active")]
    ElectionNotActive,

    #[msg("Election has ended")]
    ElectionEnded,

    #[msg("Election has not ended yet")]
    ElectionNotEnded,

    #[msg("Tally already requested")]
    TallyAlreadyRequested,

    #[msg("Tally not requested yet")]
    TallyNotRequested,

    #[msg("Tally already finalized")]
    TallyAlreadyFinalized,

    #[msg("Invalid MPC signature")]
    InvalidMpcSignature,

    #[msg("Invalid threshold")]
    InvalidThreshold,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid election status")]
    InvalidElectionStatus,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
