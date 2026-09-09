//! Scheduled refresh entrypoint. Configure REFRESH_TOKEN and Supabase variables in the
//! deployment secret store, then invoke this binary from cron or a managed scheduler.
use std::sync::Arc;

use backend::services::{refresh, supabase::SupabaseClient};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let summary = refresh::run(Default::default(), Arc::new(SupabaseClient::new())).await;
    tracing::info!(
        attempted = summary.attempted,
        succeeded = summary.succeeded,
        failed = summary.failed,
        "refresh worker completed"
    );
}
