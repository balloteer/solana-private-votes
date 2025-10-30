use core::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CryptoError {
    InvalidPublicKey,
    InvalidSecretKey,
    InvalidCiphertext,
    DecryptionFailed,
    InvalidCurvePoint,
    SerializationError,
    InvalidNullifierInput,
    InvalidCommitmentInput,
    ArithmeticError,
}

impl fmt::Display for CryptoError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            CryptoError::InvalidPublicKey => write!(f, "Invalid public key"),
            CryptoError::InvalidSecretKey => write!(f, "Invalid secret key"),
            CryptoError::InvalidCiphertext => write!(f, "Invalid ciphertext"),
            CryptoError::DecryptionFailed => write!(f, "Decryption failed"),
            CryptoError::InvalidCurvePoint => write!(f, "Invalid point on curve"),
            CryptoError::SerializationError => write!(f, "Serialization error"),
            CryptoError::InvalidNullifierInput => write!(f, "Invalid nullifier input"),
            CryptoError::InvalidCommitmentInput => write!(f, "Invalid commitment input"),
            CryptoError::ArithmeticError => write!(f, "Arithmetic error"),
        }
    }
}

#[cfg(feature = "std")]
impl std::error::Error for CryptoError {}
