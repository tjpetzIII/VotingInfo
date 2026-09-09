# Preserved routing contract

- GET /health returns status 200 and {"status":"ok"}.
- Existing GET voter-info, elections, ballot, all-elections, registration and elections/dates contracts remain covered by integration.rs.
- Each STATE_SCRAPERS entry registers GET /api/{lowercase-state}-elections and POST /api/scrape/{lowercase-state}.
- Wrong-method probes return 405 with the corresponding method in Allow, without invoking handlers.
- Unregistered state paths return 404.
- Production retains middleware and connects the listener with SocketAddr connection info; compilation verifies framework compatibility.
