pub mod mint;

use color_eyre::eyre::Result;

use crate::{fetcher::mint::mint_nft_fetcher, types::WebAppState};

pub async fn open_all_logs_fetcher(app_state: &WebAppState) -> Result<()> {
    let app_state = app_state.clone();
    tokio::spawn(async move {
        if let Err(e) = mint_nft_fetcher(&app_state).await {
            tracing::error!("Failed to start mint nft fetcher: {}", e);
        };
    });

    Ok(())
}
