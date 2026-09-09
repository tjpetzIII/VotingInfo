//! Safe scheduled reminder entrypoint. Delivery is a no-op unless a real provider is explicitly wired.
fn main() {
    tracing::info!("reminder worker ready; no reminders dispatched without an explicit provider");
}
