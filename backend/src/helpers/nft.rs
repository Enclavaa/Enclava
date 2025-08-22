use color_eyre::{
    Result,
    eyre::{self, Context},
};

use crate::{database, fetcher::mint::DatasetNFTMint, types::WebAppState};

pub async fn handle_new_nft_mint(
    app_state: &WebAppState,
    nft_minted: &DatasetNFTMint,
) -> Result<()> {
    // Check if the dataset_id exists in the database
    let dataset_id = nft_minted.dataset_id.clone();

    // Convert it to i64
    let dataset_id = dataset_id.parse::<i64>()?;

    tracing::trace!("Dataset ID After i64: {}", dataset_id);

    let mut tx = app_state.db.begin().await?;

    let agent = match database::get_agent_by_id_optional(&mut tx, dataset_id).await? {
        Some(agent) => agent,
        None => {
            return Err(eyre::eyre!(
                "Dataset ID {} does not exist in the database",
                dataset_id
            ));
        }
    };

    if agent.nft_id.is_some() {
        return Err(eyre::eyre!("Agent already has a minted NFT"));
    }

    if agent.owner_address != nft_minted.to.to_string() {
        return Err(eyre::eyre!("NFT minted to wrong address"));
    }

    let nft_id: i64 = nft_minted.token_id.to_string().parse()?;
    let nft_tx = nft_minted.tx_hash.map(|hash| hash.to_string());

    tracing::trace!("NFT ID: {}", nft_id);
    tracing::trace!("NFT TX: {:?}", nft_tx);

    // Update the agent with the nft_id and nft_tx
    database::update_agent_with_nft_details(&mut tx, agent.id, nft_id, nft_tx).await?;

    // Commit the transaction
    tx.commit().await?;

    tracing::info!("Agent {} updated with NFT details", agent.id);

    Ok(())
}
