# Data Model

No entities or serialization contracts change. Existing AppState holds shared CivicApiClient and SupabaseClient references. StateScraperConfig registry entries define each supported state and its literal read/refresh route names. New checks consume this registry without mutating application state.
