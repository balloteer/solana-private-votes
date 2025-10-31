use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PrivacyError;

#[derive(Accounts)]
#[instruction(ciphertext_c1: [u8; 32], ciphertext_c2: [u8; 32], nullifier: [u8; 32])]
pub struct CastEncryptedVote<'info> {
    #[account(
        mut,
        seeds = [b"private_election", private_election.election.as_ref()],
        bump = private_election.bump,
        constraint = private_election.status == ElectionStatus::Active @ PrivacyError::ElectionNotActive,
    )]
    pub private_election: Account<'info, PrivateElection>,

    #[account(
        init,
        payer = voter,
        space = EncryptedVote::LEN,
        seeds = [b"encrypted_vote", private_election.key().as_ref(), nullifier.as_ref()],
        bump
    )]
    pub encrypted_vote: Account<'info, EncryptedVote>,

    #[account(
        mut,
        seeds = [b"nullifier_set", private_election.election.as_ref()],
        bump = nullifier_set.bump,
    )]
    pub nullifier_set: Account<'info, NullifierSet>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CastEncryptedVote>,
    ciphertext_c1: [u8; 32],
    ciphertext_c2: [u8; 32],
    nullifier: [u8; 32],
    commitment: [u8; 32],
    // ZK proof components (for future implementation)
    _zk_proof_a: Option<[u8; 32]>,
    _zk_proof_b: Option<[u8; 64]>,
    _zk_proof_c: Option<[u8; 32]>,
) -> Result<()> {
    let private_election = &mut ctx.accounts.private_election;
    let encrypted_vote = &mut ctx.accounts.encrypted_vote;
    let nullifier_set = &mut ctx.accounts.nullifier_set;

    // Check election hasn't ended
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time < private_election.ends_at,
        PrivacyError::ElectionEnded
    );

    // Check nullifier hasn't been used (prevent double voting)
    require!(
        !nullifier_set.contains(&nullifier),
        PrivacyError::NullifierAlreadyUsed
    );

    // TODO: Verify ZK proof of voter eligibility
    // For MVP, we skip this and add it in the ZK circuit phase
    // This would verify:
    // 1. Voter is in the merkle tree (eligible)
    // 2. Nullifier is correctly computed from voter secret
    // 3. Vote is within valid range
    /*
    if let (Some(proof_a), Some(proof_b), Some(proof_c)) = (_zk_proof_a, _zk_proof_b, _zk_proof_c) {
        verify_groth16_proof(
            &private_election.voter_merkle_root,
            &nullifier,
            &private_election.election_id,
            &proof_a,
            &proof_b,
            &proof_c,
        )?;
    }
    */

    // Store encrypted vote
    encrypted_vote.bump = ctx.bumps.encrypted_vote;
    encrypted_vote.election = private_election.key();
    encrypted_vote.ciphertext_c1 = ciphertext_c1;
    encrypted_vote.ciphertext_c2 = ciphertext_c2;
    encrypted_vote.nullifier = nullifier;
    encrypted_vote.commitment = commitment;
    encrypted_vote.timestamp = current_time;

    // Add nullifier to the set
    nullifier_set.insert(nullifier)?;

    // Increment vote count
    private_election.total_encrypted_votes = private_election
        .total_encrypted_votes
        .checked_add(1)
        .ok_or(PrivacyError::ArithmeticOverflow)?;

    msg!("Encrypted vote cast successfully");
    msg!("Election: {}", private_election.key());
    msg!("Nullifier: {:?}", nullifier);
    msg!("Total votes: {}", private_election.total_encrypted_votes);

    Ok(())
}
