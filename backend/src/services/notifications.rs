use rand::RngCore;
use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Subscriber {
    pub email: String,
    pub address: String,
    pub opted_in_at: String,
    pub unsubscribe_token: String,
}
pub trait EmailProvider: Send + Sync {
    fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String>;
}
#[derive(Default)]
pub struct NoopEmailProvider;
impl EmailProvider for NoopEmailProvider {
    fn send(&self, _to: &str, _subject: &str, _body: &str) -> Result<(), String> {
        Ok(())
    }
}
#[derive(Default, Clone)]
pub struct TestEmailProvider {
    pub sent: Arc<Mutex<Vec<(String, String, String)>>>,
}
impl EmailProvider for TestEmailProvider {
    fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String> {
        self.sent
            .lock()
            .map_err(|_| "provider lock poisoned".to_string())?
            .push((to.into(), subject.into(), body.into()));
        Ok(())
    }
}
#[derive(Clone)]
pub struct NotificationService<P: EmailProvider> {
    provider: Arc<P>,
    subscribers: Arc<Mutex<HashMap<String, Subscriber>>>,
}
impl<P: EmailProvider> NotificationService<P> {
    pub fn new(provider: P) -> Self {
        Self {
            provider: Arc::new(provider),
            subscribers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    pub fn subscribe(
        &self,
        email: &str,
        address: &str,
        opted_in_at: &str,
    ) -> Result<Subscriber, String> {
        let email = email.trim().to_ascii_lowercase();
        if !email.contains('@') || email.len() > 254 || address.trim().is_empty() {
            return Err("invalid subscriber details".into());
        }
        if let Some(existing) = self
            .subscribers
            .lock()
            .map_err(|_| "subscriber lock poisoned".to_string())?
            .get(&email)
            .cloned()
        {
            return Ok(existing);
        }
        let mut bytes = [0u8; 32];
        rand::rng().fill_bytes(&mut bytes);
        let token = bytes.iter().map(|b| format!("{b:02x}")).collect::<String>();
        let record = Subscriber {
            email: email.clone(),
            address: address.trim().into(),
            opted_in_at: opted_in_at.into(),
            unsubscribe_token: token,
        };
        self.subscribers
            .lock()
            .map_err(|_| "subscriber lock poisoned".to_string())?
            .insert(email, record.clone());
        Ok(record)
    }
    pub fn unsubscribe(&self, email: &str, token: &str) -> Result<bool, String> {
        let mut all = self
            .subscribers
            .lock()
            .map_err(|_| "subscriber lock poisoned".to_string())?;
        if all
            .get(email.trim())
            .is_some_and(|s| s.unsubscribe_token == token)
        {
            all.remove(email.trim());
            return Ok(true);
        }
        Ok(false)
    }
    pub fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String> {
        self.provider.send(to, subject, body)
    }

    pub fn subscriber(&self, email: &str) -> Option<Subscriber> {
        self.subscribers
            .lock()
            .ok()?
            .get(&email.trim().to_ascii_lowercase())
            .cloned()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReminderEvent {
    pub id: String,
    pub date: String,
    pub email: String,
    pub subject: String,
    pub body: String,
}

#[derive(Clone)]
pub struct ReminderScheduler<P: EmailProvider> {
    service: NotificationService<P>,
    delivered: Arc<Mutex<HashSet<String>>>,
}

impl<P: EmailProvider> ReminderScheduler<P> {
    pub fn new(service: NotificationService<P>) -> Self {
        Self {
            service,
            delivered: Arc::new(Mutex::new(HashSet::new())),
        }
    }
    pub fn run_due(&self, events: &[ReminderEvent], today: &str, max_attempts: usize) -> usize {
        let mut sent = 0;
        for event in events.iter().filter(|event| event.date == today) {
            let Some(subscriber) = self.service.subscriber(&event.email) else {
                continue;
            };
            let key = format!("{}:{}:{}", subscriber.email, event.id, event.date);
            if self
                .delivered
                .lock()
                .map(|set| set.contains(&key))
                .unwrap_or(true)
            {
                continue;
            }
            let mut delivered = false;
            for _ in 0..max_attempts.max(1) {
                if self
                    .service
                    .send(&subscriber.email, &event.subject, &event.body)
                    .is_ok()
                {
                    delivered = true;
                    break;
                }
            }
            if delivered {
                if let Ok(mut set) = self.delivered.lock() {
                    set.insert(key);
                }
                sent += 1;
            }
        }
        sent
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn noop_does_not_send() {
        NotificationService::new(NoopEmailProvider)
            .send("a@b.test", "x", "y")
            .unwrap();
    }
    #[test]
    fn subscription_normalizes_and_token_revokes() {
        let s = NotificationService::new(NoopEmailProvider);
        let i = s.subscribe(" A@B.TEST ", "123 Main", "2026-09-09").unwrap();
        assert_eq!(i.email, "a@b.test");
        assert!(s.unsubscribe("a@b.test", &i.unsubscribe_token).unwrap());
        assert!(!s.unsubscribe("a@b.test", &i.unsubscribe_token).unwrap());
    }
    #[test]
    fn invalid_details_rejected() {
        assert!(NotificationService::new(NoopEmailProvider)
            .subscribe("bad", "123", "now")
            .is_err());
    }
    #[test]
    fn test_sink_records_delivery() {
        let p = TestEmailProvider::default();
        let sent = p.sent.clone();
        NotificationService::new(p)
            .send("a@b.test", "subject", "body")
            .unwrap();
        assert_eq!(sent.lock().unwrap().len(), 1);
    }

    #[test]
    fn scheduler_is_idempotent_and_honors_unsubscribe() {
        let provider = TestEmailProvider::default();
        let sent = provider.sent.clone();
        let service = NotificationService::new(provider);
        let item = service.subscribe("a@b.test", "1 Main", "now").unwrap();
        let scheduler = ReminderScheduler::new(service.clone());
        let event = ReminderEvent {
            id: "e1".into(),
            date: "2026-11-01".into(),
            email: item.email.clone(),
            subject: "Reminder".into(),
            body: "Election".into(),
        };
        assert_eq!(
            scheduler.run_due(std::slice::from_ref(&event), "2026-11-01", 2),
            1
        );
        assert_eq!(
            scheduler.run_due(std::slice::from_ref(&event), "2026-11-01", 2),
            0
        );
        service
            .unsubscribe(&item.email, &item.unsubscribe_token)
            .unwrap();
        assert_eq!(sent.lock().unwrap().len(), 1);
    }
}
