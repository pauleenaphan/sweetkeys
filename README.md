# Sweetkeys

Sweetkeys is a keyboard-first web app built with Next.js, tRPC, Prisma, Turso/libSQL, and Turbo.

## Development

Install dependencies:

```sh
npm install
```

Start the dev server:

```sh
npm run dev
```

Run checks:

```sh
npm run check
```

Build for production:

```sh
npm run build
```

## Prisma + Turso

This app uses Prisma with Turso/libSQL through `@prisma/adapter-libsql`.

Environment variables:

- `DATABASE_URL` is used by Prisma CLI commands that work against a local SQLite file.
- `TURSO_DATABASE_URL` is used by the runtime Prisma client. Use a `libsql://...` Turso URL in production or `file:./prisma/db.sqlite` locally.
- `TURSO_AUTH_TOKEN` is the Turso database token. Leave it empty only for local file-based SQLite.

Useful commands:

- `npm run db:generate` regenerates the Prisma client.
- `npm run db:migrate:local -- --name init` creates a migration against the local SQLite database.
- Apply the generated migration SQL to Turso with the Turso CLI, for example:

```sh
turso db shell <database-name> < ./prisma/migrations/<migration-name>/migration.sql
```

Prisma Migrate and introspection do not run directly against Turso; generate migrations locally, then apply the SQL with `turso db shell`.

## Turbo

Project scripts are routed through Turbo:

- `npm run dev` starts the Next.js dev server through `turbo run next:dev`.
- `npm run build` runs `turbo run next:build`.
- `npm run check` runs linting and typechecking through Turbo.

## Stack

- Next.js
- tRPC
- Prisma
- Turso/libSQL
- Tailwind CSS
- Turbo
