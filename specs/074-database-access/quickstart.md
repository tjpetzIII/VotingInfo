# Validation quickstart
Requires Python 3 and a running Docker daemon. From the repository root run:

```sh
python3 backend/tests/test_database_permissions.py
```

The runner starts a disposable PostgreSQL container, applies each migration history into its own database, executes the role matrix, and removes only its own container. No environment secrets or deployed database are used. All operations must pass; missing policies and unexpected inventory fail loudly. Existing frontend/backend CI gates also remain required. See docs/DATABASE_ACCESS.md for live inspection and rollout.
