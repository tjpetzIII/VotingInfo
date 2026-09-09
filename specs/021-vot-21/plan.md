# Implementation Plan: VOT-21

Add `services/notifications.rs` with `EmailProvider`, `NoopEmailProvider`, `TestEmailProvider`, and a subscriber record/store. Generate opaque unsubscribe tokens from OS randomness, normalize/validate email, and expose explicit configuration with send disabled unless a future provider is selected. Keep the service independent of routes so VOT-22/23 can add scheduling and persistence safely.
