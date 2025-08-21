pub mod nft_mint;

use color_eyre::eyre::Result;
pub use nft_mint::*;

pub async fn open_all_logs_fetcher() -> Result<()> {
    tokio::spawn(async move {
        if let Err(e) = mint_nft_fetcher().await {
            tracing::error!("Failed to start mint nft fetcher: {}", e);
        };
    });

    Ok(())
}
