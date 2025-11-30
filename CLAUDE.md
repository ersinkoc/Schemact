# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Website:** [schemact.oxog.dev](https://schemact.oxog.dev) | **Repository:** [github.com/ersinkoc/schemact](https://github.com/ersinkoc/schemact)

## Project Overview

Schemact is a zero-dependency, AST-based database schema management tool with a custom `.sigl` DSL. It supports PostgreSQL, MySQL, and SQLite through a pluggable adapter architecture.

## Build Commands

```bash
npm run build          # Compile TypeScript to ./dist
npm run dev            # Watch mode compilation
npm run schemact          # Run CLI directly with ts-node (dev mode)
```

## Testing

```bash
npm test                               # Run full test suite (304 tests)
node demo-blog/test-migrations.js      # Demo integration tests
node demo-blog/test-all-generators.js  # Demo multi-database generator tests
```

Test files are in `tests/` directory:
- `lexer.test.js` - Tokenization tests
- `parser.test.js` - AST parsing tests
- `postgres-generator.test.js` - PostgreSQL DDL generation
- `mysql-generator.test.js` - MySQL DDL generation
- `sqlite-generator.test.js` - SQLite DDL generation
- `ledger.test.js` - Migration state management
- `utils.test.js` - Utility function tests
- `integration.test.js` - End-to-end tests

## Architecture

### Compiler Pipeline
```
.sact file → Lexer (tokens) → Parser (AST) → Generator (SQL)
```

- **Lexer** (`src/ast/lexer.ts`): Character-by-character tokenization of `.sigl` files
- **Parser** (`src/ast/parser.ts`): Token stream to `SchemaAST` with model definitions
- **Generators** (`src/generators/`): Database-specific SQL DDL generation
  - `base.ts`: `SqlGenerator` interface
  - `postgres.ts`, `mysql.ts`, `sqlite.ts`: Implementation per database

### Engine Layer
- **Runner** (`src/engine/runner.ts`): Migration orchestration - loads files, parses, generates SQL, executes in transactions
- **Ledger** (`src/engine/ledger.ts`): State tracking in `.schemact_ledger.json` with file locking and SHA-256 integrity checking
- **Introspectors** (`src/engine/introspector.ts`, `mysql-introspector.ts`, `sqlite-introspector.ts`): Reverse-engineer existing database schemas

### Key Interfaces
- `DbAdapter`: Database connection abstraction (query execution, transactions)
- `SqlGenerator`: DDL generation abstraction (CREATE TABLE, ALTER, DROP)
- `SchemactConfig`: Configuration with optional file validation, logging, lock timeouts

## DSL Syntax Quick Reference

```sigl
model User {
  id Serial @pk
  email VarChar(255) @unique @notnull
  role Enum(admin, user) @default(user)
  created_at Timestamp @default(now)
}

model Post {
  id Serial @pk
  author_id Int @ref(User.id) @onDelete(CASCADE)
  title Text @notnull
}

# Comments start with hash
> RAW SQL PASSTHROUGH;
```

**Note**: Multi-word onDelete actions need quotes: `@onDelete('SET NULL')`

## Security Considerations

- SQL injection prevention via identifier escaping (`src/utils/sql-identifier-escape.ts`)
- Path traversal protection in migration name validation
- File size limits (configurable `maxMigrationFileSize`, `maxTotalMigrationsSize`)
- SHA-256 hashing for migration integrity verification

## Entry Points

- **CLI**: `src/cli.ts` - Command dispatch (init, create, up, down, status, pull)
- **Library**: `src/index.ts` - Programmatic exports for embedding

## Configuration

Projects use `schemact.config.js`:
```javascript
export default {
  adapter: new PostgresAdapter({ connectionString: '...' }),
  generator: new PostgresGenerator(),
  migrationsDir: './migrations'
}
```

## Website & Documentation

The `website/` directory contains the project's web presence:

- `index.html` - Main landing page with features, stats, quick start
- `docs.html` - Comprehensive documentation including:
  - Getting Started (installation, quick start, configuration)
  - DSL Reference (models, data types, decorators, relationships, indexes, enums)
  - CLI Reference (init, new, up, down, status, generate)
  - API Reference (Lexer, Parser, Generators, Ledger)
  - Security features and architecture overview

## Test Coverage

304 tests across 11 test files with 100% pass rate:

- Lexer: 19 tests (tokenization)
- Parser: 19 tests (AST generation)
- PostgreSQL Generator: 39 tests
- MySQL Generator: 38 tests
- SQLite Generator: 37 tests
- Ledger: 17 tests (state management)
- Utils: 50 tests (helpers)
- Integration: 16 tests (end-to-end)
- Validators: 32 tests (path/file validation)
- Logger: 20 tests (structured logging)
- Colors: 16 tests (ANSI output)
