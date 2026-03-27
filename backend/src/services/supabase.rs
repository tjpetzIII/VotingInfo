use reqwest::Client;
use serde::{de::DeserializeOwned, Serialize};

use crate::errors::AppError;

/// Thin wrapper around the Supabase PostgREST REST API.
///
/// Reads `SUPABASE_URL` and `SUPABASE_KEY` from the environment at startup.
/// If either variable is absent the client is created without them; any call
/// to `upsert` will then return a `Config` error, allowing the rest of the
/// application to start normally without Supabase credentials.
pub struct SupabaseClient {
    http: Client,
    url: Option<String>,
    key: Option<String>,
}

impl SupabaseClient {
    pub fn new() -> Self {
        Self {
            http: Client::new(),
            url: std::env::var("SUPABASE_URL").ok(),
            key: std::env::var("SUPABASE_KEY").ok(),
        }
    }

    /// Upsert a slice of records into `table`, merging on duplicate keys.
    ///
    /// The table must have a `UNIQUE` constraint that Postgres can use for
    /// conflict resolution (`ON CONFLICT DO UPDATE`).  We send
    /// `Prefer: resolution=merge-duplicates` to PostgREST, which maps to
    /// that behaviour.
    pub async fn upsert<T: Serialize>(&self, table: &str, data: &[T]) -> Result<(), AppError> {
        if data.is_empty() {
            return Ok(());
        }

        let base_url = self
            .url
            .as_deref()
            .ok_or_else(|| AppError::Config("SUPABASE_URL".into()))?;
        let key = self
            .key
            .as_deref()
            .ok_or_else(|| AppError::Config("SUPABASE_KEY".into()))?;

        let url = format!("{}/rest/v1/{}", base_url.trim_end_matches('/'), table);

        let resp = self
            .http
            .post(&url)
            .header("Authorization", format!("Bearer {key}"))
            .header("apikey", key)
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates,return=minimal")
            .json(data)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let message = resp.text().await.unwrap_or_default();
            return Err(AppError::ExternalApiError { status, message });
        }

        Ok(())
    }

    /// Fetch all rows from `table`, optionally ordered by `order` (e.g. `"election_date.asc"`).
    pub async fn fetch_all<T: DeserializeOwned>(
        &self,
        table: &str,
        order: Option<&str>,
    ) -> Result<Vec<T>, AppError> {
        let base_url = self
            .url
            .as_deref()
            .ok_or_else(|| AppError::Config("SUPABASE_URL".into()))?;
        let key = self
            .key
            .as_deref()
            .ok_or_else(|| AppError::Config("SUPABASE_KEY".into()))?;

        let mut url = format!("{}/rest/v1/{}?select=*", base_url.trim_end_matches('/'), table);
        if let Some(ord) = order {
            url.push_str(&format!("&order={ord}"));
        }

        let resp = self
            .http
            .get(&url)
            .header("Authorization", format!("Bearer {key}"))
            .header("apikey", key)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let message = resp.text().await.unwrap_or_default();
            return Err(AppError::ExternalApiError { status, message });
        }

        Ok(resp.json().await?)
    }
}
