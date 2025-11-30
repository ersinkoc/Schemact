# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-11-30

### Added

- **Comprehensive Test Suite**: 304 tests with 100% pass rate
  - Lexer tests (19 tests)
  - Parser tests (19 tests)
  - PostgreSQL Generator tests (39 tests)
  - MySQL Generator tests (38 tests)
  - SQLite Generator tests (37 tests)
  - Ledger tests (17 tests)
  - Utility tests (50 tests)
  - Integration tests (16 tests)
  - Validator tests (32 tests)
  - Logger tests (20 tests)
  - Colors tests (16 tests)
- **Full Documentation Website**: [schemact.oxog.dev](https://schemact.oxog.dev)
  - Interactive landing page with modern design
  - Complete documentation page with DSL, CLI, and API references
  - Mobile-responsive design
- **Structured Logging**: Logger utility with multiple log levels and audit trail support
- **File Validation**: Resource exhaustion protection with configurable file size limits
- **Path Validation**: Security hardening against path traversal attacks

### Changed

- Updated all documentation links to official website (schemact.oxog.dev)
- Improved README with website and documentation links
- Enhanced CONTRIBUTING guide with official repository links

### Fixed

- Windows ESM module loading compatibility (pathToFileURL)
- Parser handling for multi-word decorator arguments (e.g., `@onDelete('SET NULL')`)

### Security

- SQL identifier escaping for injection prevention
- Path traversal protection in migration name validation
- File size limits to prevent DoS attacks (5MB per file, 50MB total)
- Race condition prevention with file locking

---

## [1.0.0] - 2025-01-15

### Added

#### Core Features
- Zero-dependency database schema management tool
- Custom `.sigl` DSL with 30 data types
- AST-based compiler (Lexer → Parser → AST → Generator)
- SHA-256 integrity checking for migration files
- Transaction-based migration execution
- Batch management for grouped rollbacks
- Adapter pattern for database abstraction

#### Multi-Database Support
- **PostgreSQL** generator and introspector
- **MySQL/MariaDB** generator and introspector
- **SQLite** generator and introspector
- Database-specific type mapping and syntax
- Runtime database selection via `--database` flag

#### DSL Features
- Model definitions with clean syntax
- 30+ data types (Serial, Int, VarChar, Text, Boolean, Timestamp, Enum, etc.)
- Decorators: `@pk`, `@unique`, `@notnull`, `@default()`, `@ref()`, `@onDelete()`
- Foreign key relationships with cascade actions
- Enum types with inline value definitions
- Raw SQL escape hatch with `>` prefix
- Comment support with `#`

#### CLI Commands
- `schemact init` - Initialize new project
- `schemact create <name>` - Create timestamped migration file
- `schemact up` - Apply pending migrations
- `schemact down` - Rollback last batch
- `schemact status` - Show migration status
- `schemact pull [schema]` - Introspect database and generate .sact file
- `schemact help` - Display help information
- `schemact version` - Show version

#### CLI Options
- `--database, -d <type>` - Specify database type (postgres, mysql, sqlite)
- Runtime generator selection
- Config file generator support

#### Generators
- **PostgreSQL**: SERIAL, native BOOLEAN, JSONB, CHECK constraints for enums
- **MySQL**: INT AUTO_INCREMENT, native ENUM type, InnoDB engine, UTF8MB4
- **SQLite**: INTEGER AUTOINCREMENT, dynamic typing, PRAGMA foreign_keys

#### Introspectors
- **PostgreSQL**: information_schema queries for full schema extraction
- **MySQL**: information_schema with ENUM value extraction
- **SQLite**: PRAGMA commands for schema introspection
- Automatic type mapping from SQL to Schemact DSL
- Foreign key relationship detection
- Constraint and index extraction

#### Examples
- Blog application (simple) - Users, Posts, Comments, Tags
- E-Commerce platform (complex) - 20+ tables with orders, products, reviews
- Multi-Tenant SaaS - Tenant isolation, subscriptions, projects
- Social Media platform - Posts, DMs, followers, hashtags, notifications

#### Documentation
- Comprehensive README (800+ lines)
- Examples README with design patterns
- CONTRIBUTING guide
- CODE_OF_CONDUCT
- Multi-database comparison tables
- Full API documentation
- Real-world usage examples

#### Project Infrastructure
- Strict TypeScript configuration
- ESM module support
- Zero runtime dependencies
- Dev dependencies only (@types/node, typescript)
- Integration tests
- Git-based version control

### Changed
- N/A (Initial release)

### Deprecated
- N/A (Initial release)

### Removed
- N/A (Initial release)

### Fixed
- N/A (Initial release)

### Security
- SHA-256 hashing for migration file integrity
- Transaction rollback on errors
- SQL injection prevention in introspectors (parameterized queries recommended)
- No credential storage in config files (user-provided adapters)

---

## Release Notes

### What's New in 1.0.0

Schemact is a revolutionary database migration tool that rejects the complexity of modern ORMs in favor of a native, zero-dependency approach using a custom declarative DSL.

**Key Highlights:**

🎯 **Zero Dependencies** - Only uses Node.js built-ins. No external runtime dependencies.

🗄️ **Multi-Database** - Full support for PostgreSQL, MySQL/MariaDB, and SQLite with the same DSL.

🔄 **Two-Way Sync** - Write migrations (DSL → SQL) AND reverse-engineer databases (DB → DSL).

🔐 **Integrity Checking** - SHA-256 hashing ensures migration files haven't been tampered with.

⚡ **AST-Based** - Proper compiler pipeline, not regex replacements.

📦 **Production Ready** - Transaction support, batch management, comprehensive error handling.

**Migration Example:**

```sigl
model User {
  id        Serial        @pk
  email     VarChar(255)  @unique @notnull
  role      Enum('admin', 'user') @default('user')
  createdAt Timestamp     @default(now)
}

model Post {
  id       Serial  @pk
  title    Text    @notnull
  authorId Int     @ref(User.id) @onDelete('cascade')
}
```

Generates correct SQL for PostgreSQL, MySQL, or SQLite automatically!

**Usage:**

```bash
# Initialize
schemact init

# Create migration
schemact create add_users

# Apply migrations
schemact up

# With specific database
schemact up --database mysql

# Reverse-engineer existing database
schemact pull mydb --database mysql
```

---

## [Unreleased]

### Planned Features
- Column alterations (ALTER TABLE support)
- Index management in DSL
- Enum type management (ALTER TYPE)
- Migration squashing
- Dry-run mode (`--dry-run` flag)
- Parallel migration execution
- Migration testing utilities
- MariaDB-specific optimizations
- PostgreSQL-specific features (JSONB operators, arrays)

---

## Version History

- **1.0.1** - Comprehensive test suite, documentation website, security hardening
- **1.0.0** - Initial release with full multi-database support

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
