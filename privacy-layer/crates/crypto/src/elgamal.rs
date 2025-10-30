use curve25519_dalek::{
    constants::RISTRETTO_BASEPOINT_TABLE,
    ristretto::{CompressedRistretto, RistrettoPoint},
    scalar::Scalar,
    traits::Identity,
};
use serde::{Deserialize, Serialize};
use borsh::{BorshDeserialize, BorshSerialize};
use bytemuck::{Pod, Zeroable};

use crate::{CryptoError, Result};

/// ElGamal public key
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
#[repr(C)]
pub struct ElGamalPublicKey {
    /// Compressed Ristretto point (32 bytes)
    pub point: [u8; 32],
}

unsafe impl Pod for ElGamalPublicKey {}
unsafe impl Zeroable for ElGamalPublicKey {}

impl ElGamalPublicKey {
    /// Create from compressed point bytes
    pub fn from_bytes(bytes: [u8; 32]) -> Result<Self> {
        // Validate that it's a valid point
        let compressed = CompressedRistretto(bytes);
        compressed
            .decompress()
            .ok_or(CryptoError::InvalidPublicKey)?;

        Ok(Self { point: bytes })
    }

    /// Get the underlying point
    pub fn as_point(&self) -> Result<RistrettoPoint> {
        CompressedRistretto(self.point)
            .decompress()
            .ok_or(CryptoError::InvalidPublicKey)
    }

    /// Encrypt with explicit randomness
    /// Randomness should be generated off-chain for security
    pub fn encrypt_with_randomness(
        &self,
        message: u64,
        randomness: &[u8; 32],
    ) -> Result<ElGamalCiphertext> {
        let public_point = self.as_point()?;

        // Use provided randomness
        let r = Scalar::from_bytes_mod_order(*randomness);

        // Encode message as scalar
        let m_scalar = Scalar::from(message);

        // C1 = r * G
        let c1_point = &r * RISTRETTO_BASEPOINT_TABLE;

        // C2 = m * G + r * Y
        let m_point = &m_scalar * RISTRETTO_BASEPOINT_TABLE;
        let c2_point = m_point + (&r * public_point);

        Ok(ElGamalCiphertext {
            c1: c1_point.compress().to_bytes(),
            c2: c2_point.compress().to_bytes(),
        })
    }
}

/// ElGamal secret key
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElGamalSecretKey {
    /// Scalar value (32 bytes)
    pub scalar: [u8; 32],
}

impl ElGamalSecretKey {
    /// Create from scalar bytes
    pub fn from_bytes(bytes: [u8; 32]) -> Self {
        Self { scalar: bytes }
    }

    /// Get the underlying scalar
    pub fn as_scalar(&self) -> Scalar {
        Scalar::from_bytes_mod_order(self.scalar)
    }

    /// Decrypt a ciphertext with this secret key
    pub fn decrypt(&self, ciphertext: &ElGamalCiphertext) -> Result<u64> {
        let c1 = CompressedRistretto(ciphertext.c1)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;
        let c2 = CompressedRistretto(ciphertext.c2)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;

        let x = self.as_scalar();

        // Compute m * G = C2 - x * C1
        let m_point = c2 - (x * c1);

        // Brute force discrete log for small values (sufficient for vote counts)
        // In practice, we know votes are small integers
        for i in 0..10000u64 {
            let test_point = &Scalar::from(i) * RISTRETTO_BASEPOINT_TABLE;
            if test_point == m_point {
                return Ok(i);
            }
        }

        Err(CryptoError::DecryptionFailed)
    }
}

/// ElGamal keypair
#[derive(Debug, Clone)]
pub struct ElGamalKeypair {
    pub public: ElGamalPublicKey,
    pub secret: ElGamalSecretKey,
}

impl ElGamalKeypair {
    /// Create from existing secret key
    pub fn from_secret(secret: ElGamalSecretKey) -> Self {
        let secret_scalar = secret.as_scalar();
        let public_point = &secret_scalar * RISTRETTO_BASEPOINT_TABLE;

        Self {
            public: ElGamalPublicKey {
                point: public_point.compress().to_bytes(),
            },
            secret,
        }
    }

    /// Generate a new random keypair (only for testing)
    #[cfg(test)]
    pub fn generate<R: rand_core::RngCore + rand_core::CryptoRng>(rng: &mut R) -> Self {
        let secret_scalar = Scalar::random(rng);
        let public_point = &secret_scalar * RISTRETTO_BASEPOINT_TABLE;

        Self {
            public: ElGamalPublicKey {
                point: public_point.compress().to_bytes(),
            },
            secret: ElGamalSecretKey {
                scalar: secret_scalar.to_bytes(),
            },
        }
    }
}

/// ElGamal ciphertext
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
#[repr(C)]
pub struct ElGamalCiphertext {
    /// C1 component (32 bytes)
    pub c1: [u8; 32],
    /// C2 component (32 bytes)
    pub c2: [u8; 32],
}

unsafe impl Pod for ElGamalCiphertext {}
unsafe impl Zeroable for ElGamalCiphertext {}

impl ElGamalCiphertext {
    /// Homomorphic addition of two ciphertexts
    /// E(m1) + E(m2) = E(m1 + m2)
    pub fn add(&self, other: &ElGamalCiphertext) -> Result<ElGamalCiphertext> {
        let c1_self = CompressedRistretto(self.c1)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;
        let c2_self = CompressedRistretto(self.c2)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;

        let c1_other = CompressedRistretto(other.c1)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;
        let c2_other = CompressedRistretto(other.c2)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;

        // Add the points
        let c1_sum = c1_self + c1_other;
        let c2_sum = c2_self + c2_other;

        Ok(ElGamalCiphertext {
            c1: c1_sum.compress().to_bytes(),
            c2: c2_sum.compress().to_bytes(),
        })
    }

    /// Scalar multiplication for weighted addition
    pub fn mul_scalar(&self, scalar: u64) -> Result<ElGamalCiphertext> {
        let c1 = CompressedRistretto(self.c1)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;
        let c2 = CompressedRistretto(self.c2)
            .decompress()
            .ok_or(CryptoError::InvalidCiphertext)?;

        let s = Scalar::from(scalar);

        Ok(ElGamalCiphertext {
            c1: (s * c1).compress().to_bytes(),
            c2: (s * c2).compress().to_bytes(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::thread_rng;

    #[test]
    fn test_keygen() {
        let mut rng = thread_rng();
        let keypair = ElGamalKeypair::generate(&mut rng);

        // Public key should be valid
        assert!(keypair.public.as_point().is_ok());
    }

    #[test]
    fn test_encryption_decryption() {
        let mut rng = thread_rng();
        let keypair = ElGamalKeypair::generate(&mut rng);

        let message = 42u64;
        let randomness = rand::Rng::gen(&mut rng);
        let ciphertext = keypair.public.encrypt_with_randomness(message, &randomness).unwrap();
        let decrypted = keypair.secret.decrypt(&ciphertext).unwrap();

        assert_eq!(message, decrypted);
    }

    #[test]
    fn test_homomorphic_addition() {
        let mut rng = thread_rng();
        let keypair = ElGamalKeypair::generate(&mut rng);

        let m1 = 10u64;
        let m2 = 32u64;

        let r1 = rand::Rng::gen(&mut rng);
        let r2 = rand::Rng::gen(&mut rng);
        let c1 = keypair.public.encrypt_with_randomness(m1, &r1).unwrap();
        let c2 = keypair.public.encrypt_with_randomness(m2, &r2).unwrap();

        let c_sum = c1.add(&c2).unwrap();
        let decrypted_sum = keypair.secret.decrypt(&c_sum).unwrap();

        assert_eq!(m1 + m2, decrypted_sum);
    }

    #[test]
    fn test_scalar_multiplication() {
        let mut rng = thread_rng();
        let keypair = ElGamalKeypair::generate(&mut rng);

        let message = 5u64;
        let scalar = 3u64;

        let randomness = rand::Rng::gen(&mut rng);
        let ciphertext = keypair.public.encrypt_with_randomness(message, &randomness).unwrap();
        let c_mul = ciphertext.mul_scalar(scalar).unwrap();
        let decrypted = keypair.secret.decrypt(&c_mul).unwrap();

        assert_eq!(message * scalar, decrypted);
    }

    #[test]
    fn test_serialization() {
        let mut rng = thread_rng();
        let keypair = ElGamalKeypair::generate(&mut rng);

        // Test borsh serialization
        let serialized = borsh::to_vec(&keypair.public).unwrap();
        let deserialized: ElGamalPublicKey = borsh::from_slice(&serialized).unwrap();

        assert_eq!(keypair.public, deserialized);
    }
}
