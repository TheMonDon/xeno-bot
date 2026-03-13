# Migrations

This project uses Knex for schema migrations. Follow these steps to run and manage migrations safely.

## Local development

1. Ensure the development DB is configured in `knexfile.js` (defaults to `data/dev.sqlite`).
2. Run migrations:

```bash
npx knex --knexfile knexfile.js migrate:latest --env development
```

3. To rollback the last batch:

```bash
npx knex --knexfile knexfile.js migrate:rollback --env development
```

## Production

1. Verify you have a recent backup of the production DB.
2. Set `NODE_ENV=production` and ensure `DATABASE_URL` (or production connection) is set.
3. Run migrations on a maintenance window if necessary:

```bash
NODE_ENV=production npx knex --knexfile knexfile.js migrate:latest --env production
```

4. If a migration includes data transformations, review any accompanying `scripts/` dry-run utilities (e.g. `scripts/dry_run_fix_standard_facehugger.js`) and run them in `--dry` or without `--apply` first to inspect planned changes.

## Migration conventions

- Migration filenames are timestamped: `YYYYMMDDHHMMSS_description.js`.
- For data-changing migrations, include a reversible `down` where feasible and mark modified rows in a `_migrations` field in JSON `data` for safe reversion.

## Troubleshooting

- If `knex` reports "Already up to date", ensure the correct `--env` or `NODE_ENV` is set and the `migrations` table exists in the target DB.
- Always run the project's dry-run scripts before applying to production when available.

## Contact

If you're unsure about applying a migration, ask a teammate or open an issue in the project repo before proceeding.
