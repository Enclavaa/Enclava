pub mod mint;

use color_eyre::eyre::Result;

use crate::{fetcher::mint::mint_nft_fetcher, types::WebAppState};

/// Starts all log fetchers with automatic retry mechanism
///
/// This function ensures that the mint_nft_fetcher never stops running by implementing
/// an exponential backoff retry strategy. If the fetcher fails, it will automatically
/// restart with increasing delays between attempts (capped at 5 minutes).
pub async fn open_all_logs_fetcher(app_state: &WebAppState) -> Result<()> {
    let app_state = app_state.clone();

    tokio::spawn(async move {
        let mut retry_count = 0u32;
        let max_retry_delay_secs = 5 * 60; // 5 minutes maximum delay
        let initial_retry_delay_secs = 10; // Start with 10 second

        loop {
            tracing::info!("Starting mint_nft_fetcher (attempt #{})", retry_count + 1);

            match mint_nft_fetcher(&app_state).await {
                Ok(_) => {
                    // Fetcher completed successfully (should never happen as it's an infinite loop)
                    tracing::warn!("mint_nft_fetcher completed unexpectedly, restarting...");
                    retry_count = 0; // Reset retry count on successful run
                }
                Err(e) => {
                    retry_count += 1;

                    // Calculate exponential backoff delay: min(initial * 2^retry_count, max_delay)
                    let delay_secs = std::cmp::min(
                        initial_retry_delay_secs * 2u64.pow(retry_count.saturating_sub(1)),
                        max_retry_delay_secs,
                    );

                    tracing::error!(
                        "mint_nft_fetcher failed (attempt #{}): {}. Retrying in {} seconds...",
                        retry_count,
                        e,
                        delay_secs
                    );

                    // Log the full error chain for debugging
                    if let Some(source) = e.source() {
                        tracing::debug!("Error source chain: {:?}", source);
                    }

                    // Wait before retrying
                    tokio::time::sleep(tokio::time::Duration::from_secs(delay_secs)).await;
                }
            }
        }
    });

    Ok(())
}
