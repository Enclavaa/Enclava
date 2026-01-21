use std::str::FromStr;

use alloy::{
    primitives::{Address, FixedBytes, U256},
    providers::{Provider, ProviderBuilder},
    rpc::types::Filter,
    sol,
    sol_types::SolEvent,
};

use color_eyre::{
    Result,
    eyre::{Context, eyre},
};

use crate::{
    config::{ENCLAVA_CONTRACT_ADDRESS, HEDERA_TESTNET_RPC_URL},
    helpers::nft::handle_new_nft_mint,
    types::WebAppState,
};

#[derive(Debug, Clone)]
pub struct DatasetNFTMint {
    pub to: Address,
    pub token_id: U256,
    pub dataset_id: String,
    pub tx_hash: Option<FixedBytes<32>>,
}

// Generate strongly typed bindings for your contract events
sol! {
    event DatasetNFTMinted(address indexed to, uint256 indexed tokenId, string datasetId);
    event DatasetUsed(uint256 indexed tokenId, address indexed user, uint256 amount);
    event AmountClaimed(uint256 indexed tokenId, address indexed owner, uint256 amount);
}

pub async fn mint_nft_fetcher(app_state: &WebAppState) -> Result<()> {
    tracing::info!("Starting mint nft fetcher (Polling Mod)...");

    // Create the provider.
    let rpc_url = HEDERA_TESTNET_RPC_URL;

    let provider = ProviderBuilder::new().connect_http(rpc_url.parse()?);

    let contract_address =
        Address::from_str(ENCLAVA_CONTRACT_ADDRESS).context("Failed to parse contract address")?;

    let event_sig = "DatasetNFTMinted(address,uint256,string)";

    // Throw a test error to test the error handling
    // return Err(eyre!("Test error"));

    let mut last_block = provider
        .get_block_number()
        .await
        .context("Failed to get initial block number")?;

    tracing::info!("Mint NFT fetcher initialized at block {}", last_block);

    loop {
        // Wrap the polling logic in a result to handle transient errors gracefully
        match poll_for_events(
            &provider,
            contract_address,
            event_sig,
            &mut last_block,
            app_state,
        )
        .await
        {
            Ok(_) => {
                // Successful poll, continue to next iteration
            }
            Err(e) => {
                // Log the error without crashing the fetcher
                tracing::warn!("Error during event polling (will retry): {}", e);

                // Brief delay before retrying to avoid hammering the RPC on persistent errors
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        }

        // Sleep for a while before polling again
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
    }
}

/// Polls for new DatasetNFTMinted events and processes them
///
/// This function handles a single polling iteration, checking for new events
/// between the last processed block and the current block.
async fn poll_for_events(
    provider: &impl Provider,
    contract_address: Address,
    event_sig: &str,
    last_block: &mut u64,
    app_state: &WebAppState,
) -> Result<()> {
    let current_block = provider
        .get_block_number()
        .await
        .context("Failed to get current block number")?;

    tracing::debug!("Polling blocks {} to {}", last_block, current_block);

    // Throw a test error to test the error handling
    // return Err(eyre!("Test error"));

    if current_block >= *last_block {
        let filter = Filter::new()
            .address(contract_address)
            .event(event_sig)
            .from_block(*last_block);

        let filtered_logs = provider
            .get_logs(&filter)
            .await
            .context("Failed to fetch logs from provider")?;

        for log in filtered_logs {
            tracing::info!("New DatasetNFTMinted event detected: {:?}", log);

            let log_data = log.data();

            // Try decode as DatasetNFTMinted
            if let Ok(event) = DatasetNFTMinted::decode_log_data(&log_data) {
                tracing::trace!(
                    "New NFT Minted! to: {:?}, tokenId: {:?}, datasetId: {}",
                    event.to,
                    event.tokenId,
                    event.datasetId
                );

                let dataset_nft = DatasetNFTMint {
                    to: event.to,
                    token_id: event.tokenId,
                    dataset_id: event.datasetId,
                    tx_hash: log.transaction_hash,
                };

                tracing::info!("Processing DatasetNFTMinted: {:?}", dataset_nft);

                // Spawn a new task to handle the event asynchronously
                // This prevents a single event processing failure from blocking other events
                let app_state = app_state.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_new_nft_mint(&app_state, &dataset_nft).await {
                        tracing::error!(
                            "Failed to handle NFT mint for token_id {}: {}",
                            dataset_nft.token_id,
                            e
                        );
                    }
                });
            } else {
                tracing::warn!("Failed to decode log data as DatasetNFTMinted event");
            }
        }

        *last_block = current_block;
    }

    Ok(())
}
