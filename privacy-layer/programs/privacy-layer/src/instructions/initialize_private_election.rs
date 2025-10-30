use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PrivacyError;

#[derive(Accounts)]
#[instruction(election_id: [u8; 32])]
pub struct InitializePrivateElection<'info> {
    #[account(
        init,
        payer = authority,
        space = PrivateElection::LEN,
        seeds = [b"private_election", election.key().as_ref()],
        bump
    )]
    pub private_election: Account<'info, PrivateElection>,

    #[account(
        init,
        payer = authority,
        space = 8 + NullifierSet::INIT_LEN + 10000, // Reserve space for nullifiers
        seeds = [b"nullifier_set", election.key().as_ref()],
        bump
    )]
    pub nullifier_set: Account<'info, NullifierSet>,

    /// CHECK: This is the public election account from mpl-gov-micro
    /// We don't deserialize it here, just reference it
    pub election: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializePrivateElection>,
    election_id: [u8; 32],
    mpc_public_key: [u8; 32],
    voter_merkle_root: [u8; 32],
    ends_at: i64,
    num_options: u8,
) -> Result<()> {
    let private_election = &mut ctx.accounts.private_election;
    let nullifier_set = &mut ctx.accounts.nullifier_set;

    // Initialize private election
    private_election.bump = ctx.bumps.private_election;
    private_election.authority = ctx.accounts.authority.key();
    private_election.election = ctx.accounts.election.key();
    private_election.mpc_public_key = mpc_public_key;
    private_election.voter_merkle_root = voter_merkle_root;
    private_election.election_id = election_id;
    private_election.total_encrypted_votes = 0;
    private_election.tally_requested = false;
    private_election.tally_finalized = false;
    private_election.created_at = Clock::get()?.unix_timestamp;
    private_election.ends_at = ends_at;
    private_election.num_options = num_options;
    private_election.status = ElectionStatus::Active;

    // Initialize nullifier set
    nullifier_set.bump = ctx.bumps.nullifier_set;
    nullifier_set.election = ctx.accounts.election.key();
    nullifier_set.nullifiers = Vec::new();

    msg!("Private election initialized: {}", private_election.key());
    msg!("Public key: {:?}", mpc_public_key);
    msg!("Voter merkle root: {:?}", voter_merkle_root);

    Ok(())
}
