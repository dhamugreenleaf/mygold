# Production Safety & Database Migration Rules

1. **Non-Destructive DB Migrations**:
   - Whenever backend or database schema changes occur, ALWAYS ensure safe, idempotent, and non-destructive migrations.
   - NEVER drop existing tables or delete existing user data in production.
   - Use `IF NOT EXISTS` or column existence checks when adding or altering columns/indexes.

2. **Production Integrity**:
   - Always keep the application safe for production deployment (`NODE_ENV=production`).
   - Retain backward compatibility for all REST APIs and database models.
