# SCHEMACT: Building a Database Schema Management Tool from Scratch

> **A Comprehensive Implementation Guide**
>
> This document explains how to build Schemact—a zero-dependency, AST-based database schema management tool with a custom DSL—from the ground up. Every architectural decision, implementation detail, and security consideration is covered.

---

## Table of Contents

1. [Introduction & Vision](#1-introduction--vision)
2. [Project Setup & Architecture](#2-project-setup--architecture)
3. [The DSL Design](#3-the-dsl-design)
4. [Compiler Pipeline Overview](#4-compiler-pipeline-overview)
5. [Lexer Implementation](#5-lexer-implementation)
6. [Parser Implementation](#6-parser-implementation)
7. [Type System & AST Definitions](#7-type-system--ast-definitions)
8. [SQL Generators](#8-sql-generators)
9. [Engine Layer](#9-engine-layer)
10. [Database Introspection](#10-database-introspection)
11. [CLI Implementation](#11-cli-implementation)
12. [Utility Functions](#12-utility-functions)
13. [Security Measures](#13-security-measures)
14. [Testing Strategy](#14-testing-strategy)
15. [Lessons Learned](#15-lessons-learned)

---

## 1. Introduction & Vision

### 1.1 What is Schemact?

Schemact is a **database schema management tool** that allows developers to define database schemas using a custom Domain-Specific Language (DSL) and automatically generate SQL migrations for multiple database systems.

### 1.2 Core Goals

1. **Zero Dependencies**: No external runtime libraries—pure Node.js APIs only
2. **Multi-Database Support**: PostgreSQL, MySQL, and SQLite from a single schema definition
3. **Type Safety**: Full TypeScript implementation with strict mode
4. **Security First**: SQL injection prevention, path traversal protection, integrity verification
5. **Developer Experience**: Clear error messages, colored output, intuitive CLI

### 1.3 The Problem We're Solving

Traditional database migration tools have several pain points:

```
❌ SQL-first approach requires writing database-specific code
❌ ORM-based tools couple schema to application code
❌ Most tools lack integrity verification for applied migrations
❌ Cross-database compatibility requires manual SQL translation
```

Schemact's solution:

```
✅ Single DSL → Multiple database SQL outputs
✅ Decoupled schema definition from application code
✅ SHA-256 integrity checking for all migrations
✅ Automatic type mapping per database
```

### 1.4 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SCHEMACT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  .sigl   │───▶│  Lexer   │───▶│  Parser  │───▶│   AST    │  │
│  │  Files   │    │ (Tokens) │    │  (Tree)  │    │ (Schema) │  │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘  │
│                                                        │        │
│                    ┌───────────────────────────────────┘        │
│                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SQL GENERATORS                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │ PostgreSQL │  │   MySQL    │  │   SQLite   │        │   │
│  │  │ Generator  │  │ Generator  │  │ Generator  │        │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │   │
│  └────────┼───────────────┼───────────────┼────────────────┘   │
│           ▼               ▼               ▼                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     ENGINE LAYER                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   Runner     │  │    Ledger    │  │ Introspector │  │   │
│  │  │ (Orchestrate)│  │   (State)    │  │  (Reverse)   │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      DATABASE                            │   │
│  │        PostgreSQL    │    MySQL    │    SQLite           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Technology Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| Language | TypeScript 5.9+ | Type safety, modern features |
| Target | ES2022 | Native async/await, top-level await |
| Module System | ESM | Modern import/export |
| Runtime | Node.js 18+ | LTS, native fetch, improved fs |
| Dependencies | **Zero** | Maximum portability |

---

## 2. Project Setup & Architecture

### 2.1 Directory Structure

```
schemact/
├── src/                          # TypeScript source (5,130 lines)
│   ├── ast/                      # Compiler pipeline
│   │   ├── lexer.ts              # Tokenizer (317 lines)
│   │   ├── parser.ts             # AST builder (288 lines)
│   │   └── types.ts              # Type definitions (265 lines)
│   │
│   ├── generators/               # SQL generation
│   │   ├── base.ts               # Interface (23 lines)
│   │   ├── postgres.ts           # PostgreSQL (371 lines)
│   │   ├── mysql.ts              # MySQL (402 lines)
│   │   └── sqlite.ts             # SQLite (359 lines)
│   │
│   ├── engine/                   # Runtime engine
│   │   ├── runner.ts             # Migration orchestrator (499 lines)
│   │   ├── ledger.ts             # State management (534 lines)
│   │   ├── introspector.ts       # PostgreSQL introspection (340 lines)
│   │   ├── mysql-introspector.ts # MySQL introspection (311 lines)
│   │   └── sqlite-introspector.ts# SQLite introspection (340 lines)
│   │
│   ├── utils/                    # Utilities
│   │   ├── colors.ts             # ANSI colors (41 lines)
│   │   ├── logger.ts             # Structured logging (250 lines)
│   │   ├── formatting.ts         # DSL formatting (132 lines)
│   │   ├── file-validator.ts     # Size validation (146 lines)
│   │   ├── path-validator.ts     # Path security (215 lines)
│   │   ├── connection-validator.ts # DB connection (155 lines)
│   │   └── sql-identifier-escape.ts # SQL escaping (142 lines)
│   │
│   ├── cli.ts                    # CLI entry point (515 lines)
│   └── index.ts                  # Library exports
│
├── tests/                        # Test suite (304 tests)
│   ├── test-runner.js            # Custom test framework
│   ├── lexer.test.js             # 19 tests
│   ├── parser.test.js            # 19 tests
│   ├── postgres-generator.test.js# 39 tests
│   ├── mysql-generator.test.js   # 38 tests
│   ├── sqlite-generator.test.js  # 37 tests
│   ├── ledger.test.js            # 17 tests
│   ├── utils.test.js             # 50 tests
│   ├── integration.test.js       # 16 tests
│   ├── validators.test.js        # 32 tests
│   ├── logger.test.js            # 20 tests
│   └── colors.test.js            # 16 tests
│
├── demo-blog/                    # Example project
├── examples/                     # Additional examples
├── website/                      # Documentation site
│
├── package.json
├── tsconfig.json
└── README.md
```

### 2.2 Package Configuration

```json
{
  "name": "schemact",
  "version": "1.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "schemact": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "node tests/test-runner.js",
    "schemact": "node --loader ts-node/esm src/cli.ts"
  },
  "devDependencies": {
    "@types/node": "^20.19.25",
    "typescript": "^5.9.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Key Decisions:**

1. **`"type": "module"`** - Use ES modules natively
2. **No runtime dependencies** - Only TypeScript for compilation
3. **Dual entry points** - Library (`index.js`) and CLI (`cli.js`)
4. **Node 18+** - Modern APIs, no polyfills needed

### 2.3 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Strict Mode Benefits:**

- `noUnusedLocals` - No dead code
- `noUnusedParameters` - Clean function signatures
- `noImplicitReturns` - All paths return values
- `noFallthroughCasesInSwitch` - Prevent switch bugs

### 2.4 Design Principles

#### Principle 1: Single Responsibility
Each module has one job:
- Lexer: Convert text to tokens
- Parser: Convert tokens to AST
- Generator: Convert AST to SQL

#### Principle 2: Open/Closed
- New databases = new generator file
- No modification to existing code
- Interface-based extension

#### Principle 3: Dependency Inversion
- Engine depends on `DbAdapter` interface
- Any database can implement the interface
- No tight coupling to specific databases

#### Principle 4: Defense in Depth
- Multiple security layers
- Validation at every boundary
- Fail-safe defaults

---

## 3. The DSL Design

### 3.1 Why Create a Custom DSL?

**Alternatives Considered:**

| Approach | Pros | Cons |
|----------|------|------|
| JSON/YAML | Familiar, parsers exist | Verbose, no domain concepts |
| SQL subset | Standard, powerful | Database-specific syntax |
| Prisma-like | Proven, feature-rich | Complex, too many features |
| Custom DSL | Tailored, concise | Requires compiler implementation |

We chose a **custom DSL** because:
1. Maximum control over syntax and semantics
2. Clean, readable schema definitions
3. Educational value in building a compiler
4. No external parser dependencies

### 3.2 DSL Syntax Overview

```sigl
# This is a comment

model User {
  id          Serial        @pk
  email       VarChar(255)  @unique @notnull
  name        VarChar(100)  @notnull
  role        Enum(admin, user, guest) @default(user)
  isActive    Boolean       @default(true)
  createdAt   Timestamp     @default(now)
}

model Post {
  id          Serial        @pk
  authorId    Int           @ref(User.id) @onDelete(CASCADE)
  title       VarChar(255)  @notnull
  content     Text
  status      Enum(draft, published, archived) @default(draft)
  publishedAt Timestamp
}

# Raw SQL passthrough
> CREATE INDEX idx_posts_author ON "Post"("authorId");
> CREATE INDEX idx_posts_status ON "Post"("status");
```

### 3.3 Language Elements

#### 3.3.1 Models (Tables)

```sigl
model ModelName {
  # columns go here
}
```

- **Keyword**: `model` (lowercase)
- **Name**: PascalCase identifier (becomes table name)
- **Body**: Enclosed in `{` `}`

#### 3.3.2 Columns (Fields)

```sigl
columnName DataType(args) @decorator1 @decorator2(value)
```

- **Name**: camelCase or snake_case identifier
- **Type**: One of 18 supported types
- **Type Args**: Optional, in parentheses
- **Decorators**: Zero or more, prefixed with `@`

#### 3.3.3 Supported Data Types (18 total)

| Type | Description | SQL Equivalent |
|------|-------------|----------------|
| `Serial` | Auto-incrementing integer | SERIAL / AUTO_INCREMENT |
| `Int` | 32-bit integer | INTEGER / INT |
| `BigInt` | 64-bit integer | BIGINT |
| `SmallInt` | 16-bit integer | SMALLINT |
| `VarChar(n)` | Variable-length string | VARCHAR(n) |
| `Char(n)` | Fixed-length string | CHAR(n) |
| `Text` | Unlimited text | TEXT |
| `Boolean` | True/False | BOOLEAN |
| `Timestamp` | Date + Time | TIMESTAMP |
| `Date` | Date only | DATE |
| `Time` | Time only | TIME |
| `Decimal(p,s)` | Fixed-point decimal | NUMERIC(p,s) |
| `Numeric(p,s)` | Alias for Decimal | NUMERIC(p,s) |
| `Real` | 32-bit float | REAL / FLOAT |
| `DoublePrecision` | 64-bit float | DOUBLE PRECISION |
| `Json` | JSON document | JSON |
| `Jsonb` | Binary JSON | JSONB (PG) / JSON |
| `Uuid` | UUID identifier | UUID / CHAR(36) |
| `Enum(v1, v2, ...)` | Enumerated values | ENUM / CHECK |

#### 3.3.4 Decorators

| Decorator | Description | Example |
|-----------|-------------|---------|
| `@pk` | Primary key | `id Serial @pk` |
| `@unique` | Unique constraint | `email VarChar(255) @unique` |
| `@notnull` | NOT NULL constraint | `name VarChar(100) @notnull` |
| `@default(value)` | Default value | `@default(true)`, `@default(now)` |
| `@ref(Table.column)` | Foreign key reference | `@ref(User.id)` |
| `@onDelete(action)` | Referential action | `@onDelete(CASCADE)` |

**ON DELETE Actions:**
- `CASCADE` - Delete child rows
- `SET NULL` - Set FK to NULL (use quotes: `'SET NULL'`)
- `SET DEFAULT` - Set to default value
- `RESTRICT` - Prevent deletion
- `NO ACTION` - Deferred check (use quotes: `'NO ACTION'`)

#### 3.3.5 Comments

```sigl
# This is a line comment
model User {  # This is an inline comment
  id Serial @pk
}
```

#### 3.3.6 Raw SQL Passthrough

```sigl
> CREATE INDEX idx_name ON "Table"("column");
> ALTER TABLE "User" ADD CONSTRAINT check_email CHECK (email LIKE '%@%');
```

Lines starting with `>` are passed directly to the SQL output without processing.

### 3.4 Design Decisions & Trade-offs

#### Decision 1: Whitespace Insensitivity
```sigl
# Both are equivalent:
model User { id Serial @pk }

model User {
  id Serial @pk
}
```
**Rationale**: Flexibility for formatting preferences

#### Decision 2: No Semicolons
```sigl
# No semicolons needed
model User {
  id Serial @pk
  name VarChar(100) @notnull
}
```
**Rationale**: Cleaner syntax, newlines serve as separators

#### Decision 3: Quoted Strings for Multi-word Values
```sigl
@onDelete(CASCADE)      # Single word - no quotes
@onDelete('SET NULL')   # Multi-word - quotes required
```
**Rationale**: Simpler lexer, explicit string handling

#### Decision 4: Dot Notation for References
```sigl
@ref(User.id)  # Table.column format
```
**Rationale**: Clear, unambiguous reference syntax

---

## 4. Compiler Pipeline Overview

### 4.1 The Three-Stage Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SOURCE    │     │   TOKENS    │     │     AST     │
│   (.sigl)   │────▶│   (Array)   │────▶│   (Tree)    │
│             │     │             │     │             │
│ model User {│     │ [MODEL,     │     │ {models:[   │
│   id Serial │     │  IDENT,     │     │   {name:    │
│   @pk       │     │  LBRACE,    │     │    "User",  │
│ }           │     │  IDENT,     │     │    columns: │
│             │     │  TYPE,      │     │    [...]}]} │
│             │     │  DECORATOR, │     │             │
│             │     │  RBRACE]    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │    LEXER          │     PARSER        │
      └───────────────────┴───────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │      GENERATORS       │
              │  ┌─────┐ ┌─────┐     │
              │  │ PG  │ │MySQL│ ... │
              │  └──┬──┘ └──┬──┘     │
              └─────┼───────┼────────┘
                    ▼       ▼
              ┌─────────────────────┐
              │    SQL STATEMENTS   │
              │ CREATE TABLE "User" │
              │ (id SERIAL PRIMARY  │
              │  KEY, ...);         │
              └─────────────────────┘
```

### 4.2 Why Three Stages?

**Separation of Concerns:**

| Stage | Responsibility | Input | Output |
|-------|---------------|-------|--------|
| Lexer | Character → Token | Raw text | Token array |
| Parser | Token → Structure | Token array | AST |
| Generator | Structure → SQL | AST | SQL strings |

**Benefits:**
1. **Testability**: Each stage can be tested independently
2. **Debuggability**: Inspect intermediate representations
3. **Extensibility**: Add new generators without touching parser
4. **Maintainability**: Changes isolated to specific stage

### 4.3 Data Flow Example

**Input (.sigl file):**
```sigl
model User {
  id Serial @pk
}
```

**Stage 1 - Lexer Output (Tokens):**
```javascript
[
  { type: 'MODEL', value: 'model', line: 1, column: 1 },
  { type: 'IDENTIFIER', value: 'User', line: 1, column: 7 },
  { type: 'LBRACE', value: '{', line: 1, column: 12 },
  { type: 'IDENTIFIER', value: 'id', line: 2, column: 3 },
  { type: 'TYPE', value: 'Serial', line: 2, column: 6 },
  { type: 'DECORATOR', value: 'pk', line: 2, column: 13 },
  { type: 'RBRACE', value: '}', line: 3, column: 1 },
  { type: 'EOF', value: '', line: 3, column: 2 }
]
```

**Stage 2 - Parser Output (AST):**
```javascript
{
  models: [
    {
      name: 'User',
      columns: [
        {
          name: 'id',
          type: 'Serial',
          typeArgs: undefined,
          decorators: [
            { name: 'pk', args: undefined }
          ]
        }
      ]
    }
  ],
  rawSql: []
}
```

**Stage 3 - Generator Output (PostgreSQL SQL):**
```sql
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY
);
```

### 4.4 Error Propagation

Errors include location information for debugging:

```
ParseError at line 5, column 12: Expected column type
```

```typescript
class ParseError extends SchemactError {
  constructor(message: string, line?: number, column?: number) {
    const location = line && column ? ` at line ${line}, column ${column}` : '';
    super(`Parse error${location}: ${message}`);
  }
}
```

---

## 5. Lexer Implementation

The lexer (also called tokenizer or scanner) converts raw source text into a stream of tokens. This is the first stage of our compiler pipeline.

### 5.1 Token Types

First, define all possible token types:

```typescript
// src/ast/types.ts

export type TokenType =
  | 'MODEL'       // Keyword: model
  | 'IDENTIFIER'  // Names: User, Post, email
  | 'TYPE'        // Data types: Serial, VarChar, Int
  | 'DECORATOR'   // Attributes: pk, unique, default
  | 'LPAREN'      // (
  | 'RPAREN'      // )
  | 'LBRACE'      // {
  | 'RBRACE'      // }
  | 'COMMA'       // ,
  | 'DOT'         // .
  | 'STRING'      // 'value' or "value"
  | 'NUMBER'      // 255, 10.5
  | 'COMMENT'     // # comment (filtered out)
  | 'RAW_SQL'     // > SQL statement
  | 'NEWLINE'     // \n (mostly ignored)
  | 'EOF';        // End of file

export interface Token {
  type: TokenType;
  value: string;
  line: number;    // 1-based line number
  column: number;  // 1-based column number
}
```

### 5.2 Lexer Class Structure

```typescript
// src/ast/lexer.ts

export class Lexer {
  private input: string;           // Source text
  private position: number = 0;    // Current character index
  private line: number = 1;        // Current line (1-based)
  private column: number = 1;      // Current column (1-based)
  private tokens: Token[] = [];    // Accumulated tokens

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    // Always end with EOF token
    this.tokens.push({
      type: 'EOF',
      value: '',
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  // ... methods below
}
```

### 5.3 Core Helper Methods

```typescript
// Check if we've consumed all input
private isAtEnd(): boolean {
  return this.position >= this.input.length;
}

// Get current character without advancing
private peek(): string {
  if (this.isAtEnd()) return '\0';  // Null character as sentinel
  return this.input[this.position];
}

// Get next character without advancing
private peekNext(): string {
  if (this.position + 1 >= this.input.length) return '\0';
  return this.input[this.position + 1];
}

// Consume and return current character
private advance(): string {
  const char = this.input[this.position++];
  this.column++;
  return char;
}

// Add a token to the list
private addToken(type: TokenType, value: string, line?: number, column?: number): void {
  this.tokens.push({
    type,
    value,
    line: line ?? this.line,
    column: column ?? this.column - value.length,
  });
}

// Character type checks
private isAlpha(char: string): boolean {
  return /[a-zA-Z_]/.test(char);
}

private isDigit(char: string): boolean {
  return /[0-9]/.test(char);
}

private isAlphaNumeric(char: string): boolean {
  return this.isAlpha(char) || this.isDigit(char);
}
```

### 5.4 Main Scanning Logic

The `scanToken()` method processes one token at a time:

```typescript
private scanToken(): void {
  const char = this.advance();

  switch (char) {
    // Whitespace
    case ' ':
    case '\t':
    case '\r':
      // Ignore whitespace
      break;

    case '\n':
      // Track line numbers
      this.line++;
      this.column = 1;
      break;

    // Single-character tokens
    case '(':
      this.addToken('LPAREN', char);
      break;
    case ')':
      this.addToken('RPAREN', char);
      break;
    case '{':
      this.addToken('LBRACE', char);
      break;
    case '}':
      this.addToken('RBRACE', char);
      break;
    case ',':
      this.addToken('COMMA', char);
      break;
    case '.':
      this.addToken('DOT', char);
      break;

    // Comments
    case '#':
      this.scanComment();
      break;

    // Raw SQL
    case '>':
      if (this.column === 2) {  // > at start of line
        this.scanRawSql();
      } else {
        throw new ParseError(`Unexpected character: ${char}`, this.line, this.column - 1);
      }
      break;

    // Decorators
    case '@':
      this.scanDecorator();
      break;

    // Strings
    case "'":
    case '"':
      this.scanString(char);
      break;

    default:
      if (this.isAlpha(char)) {
        this.scanIdentifierOrKeyword(char);
      } else if (this.isDigit(char)) {
        this.scanNumber(char);
      } else {
        throw new ParseError(`Unexpected character: ${char}`, this.line, this.column - 1);
      }
  }
}
```

### 5.5 Scanning Identifiers and Keywords

The lexer must distinguish between:
- **Keywords**: `model`
- **Types**: `Serial`, `VarChar`, `Int`, etc.
- **Identifiers**: Everything else

```typescript
// Known data types
const DATA_TYPES = new Set([
  'Serial', 'Int', 'BigInt', 'SmallInt',
  'VarChar', 'Char', 'Text',
  'Boolean', 'Timestamp', 'Date', 'Time',
  'Decimal', 'Numeric', 'Real', 'DoublePrecision',
  'Json', 'Jsonb', 'Uuid', 'Enum',
]);

// Keywords
const KEYWORDS = new Set(['model']);

private scanIdentifierOrKeyword(firstChar: string): void {
  const startColumn = this.column - 1;
  let value = firstChar;

  // Consume alphanumeric characters and underscores
  while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
    value += this.advance();
  }

  // Determine token type
  if (KEYWORDS.has(value.toLowerCase())) {
    this.addToken('MODEL', value, this.line, startColumn);
  } else if (DATA_TYPES.has(value)) {
    this.addToken('TYPE', value, this.line, startColumn);
  } else {
    this.addToken('IDENTIFIER', value, this.line, startColumn);
  }
}
```

### 5.6 Scanning Numbers

Numbers can be integers or decimals:

```typescript
private scanNumber(firstChar: string): void {
  const startColumn = this.column - 1;
  let value = firstChar;

  // Collect integer part
  while (!this.isAtEnd() && this.isDigit(this.peek())) {
    value += this.advance();
  }

  // Check for decimal point followed by digit
  if (!this.isAtEnd() && this.peek() === '.' && this.isDigit(this.peekNext())) {
    value += this.advance();  // Consume '.'

    // Collect decimal part
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }
  }

  this.addToken('NUMBER', value, this.line, startColumn);
}
```

### 5.7 Scanning Strings

Strings support escape sequences:

```typescript
private scanString(quote: string): void {
  const startLine = this.line;
  const startColumn = this.column - 1;
  let value = '';

  while (!this.isAtEnd() && this.peek() !== quote) {
    if (this.peek() === '\\') {
      // Handle escape sequences
      this.advance();  // Consume backslash

      if (!this.isAtEnd()) {
        const escaped = this.advance();
        switch (escaped) {
          case 'n':  value += '\n'; break;
          case 't':  value += '\t'; break;
          case 'r':  value += '\r'; break;
          case '\\': value += '\\'; break;
          case quote: value += quote; break;
          default:   value += escaped;
        }
      }
    } else if (this.peek() === '\n') {
      // Track newlines inside strings
      this.line++;
      this.column = 1;
      value += this.advance();
    } else {
      value += this.advance();
    }
  }

  if (this.isAtEnd()) {
    throw new ParseError('Unterminated string', startLine, startColumn);
  }

  this.advance();  // Consume closing quote
  this.addToken('STRING', value, startLine, startColumn);
}
```

### 5.8 Scanning Decorators

Decorators start with `@`:

```typescript
private scanDecorator(): void {
  const startColumn = this.column - 1;
  let name = '';

  // Collect decorator name
  while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
    name += this.advance();
  }

  if (name.length === 0) {
    throw new ParseError('Expected decorator name after @', this.line, startColumn);
  }

  this.addToken('DECORATOR', name, this.line, startColumn);
}
```

### 5.9 Scanning Comments

Comments are consumed but not added to token stream:

```typescript
private scanComment(): void {
  // Consume everything until end of line
  while (!this.isAtEnd() && this.peek() !== '\n') {
    this.advance();
  }
  // Don't add to tokens - comments are ignored
}
```

### 5.10 Scanning Raw SQL

Raw SQL captures everything after `>` on the line:

```typescript
private scanRawSql(): void {
  const startColumn = this.column;
  let sql = '';

  // Skip leading whitespace
  while (!this.isAtEnd() && this.peek() === ' ') {
    this.advance();
  }

  // Capture rest of line
  while (!this.isAtEnd() && this.peek() !== '\n') {
    sql += this.advance();
  }

  this.addToken('RAW_SQL', sql.trim(), this.line, startColumn);
}
```

### 5.11 Complete Token Flow Example

**Input:**
```sigl
model User {
  id Serial @pk
  email VarChar(255) @unique
}
```

**Token Stream:**
```javascript
[
  { type: 'MODEL',      value: 'model',   line: 1, column: 1  },
  { type: 'IDENTIFIER', value: 'User',    line: 1, column: 7  },
  { type: 'LBRACE',     value: '{',       line: 1, column: 12 },
  { type: 'IDENTIFIER', value: 'id',      line: 2, column: 3  },
  { type: 'TYPE',       value: 'Serial',  line: 2, column: 6  },
  { type: 'DECORATOR',  value: 'pk',      line: 2, column: 13 },
  { type: 'IDENTIFIER', value: 'email',   line: 3, column: 3  },
  { type: 'TYPE',       value: 'VarChar', line: 3, column: 9  },
  { type: 'LPAREN',     value: '(',       line: 3, column: 16 },
  { type: 'NUMBER',     value: '255',     line: 3, column: 17 },
  { type: 'RPAREN',     value: ')',       line: 3, column: 20 },
  { type: 'DECORATOR',  value: 'unique',  line: 3, column: 22 },
  { type: 'RBRACE',     value: '}',       line: 4, column: 1  },
  { type: 'EOF',        value: '',        line: 4, column: 2  }
]
```

### 5.12 Lexer Testing Strategy

```javascript
// tests/lexer.test.js

describe('Lexer', () => {
  it('tokenizes simple model', () => {
    const lexer = new Lexer('model User { id Serial @pk }');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe('MODEL');
    expect(tokens[1].type).toBe('IDENTIFIER');
    expect(tokens[1].value).toBe('User');
  });

  it('handles all data types', () => {
    const types = ['Serial', 'Int', 'VarChar', 'Boolean', 'Timestamp'];
    for (const type of types) {
      const lexer = new Lexer(`col ${type}`);
      const tokens = lexer.tokenize();
      expect(tokens[1].type).toBe('TYPE');
      expect(tokens[1].value).toBe(type);
    }
  });

  it('throws on unterminated string', () => {
    const lexer = new Lexer("@default('unclosed");
    expect(() => lexer.tokenize()).toThrow('Unterminated string');
  });

  it('tracks line and column numbers', () => {
    const lexer = new Lexer('model User {\n  id Serial\n}');
    const tokens = lexer.tokenize();

    const idToken = tokens.find(t => t.value === 'id');
    expect(idToken.line).toBe(2);
    expect(idToken.column).toBe(3);
  });
});
```

### 5.13 Key Takeaways

1. **Single-pass algorithm** - O(n) time complexity
2. **Lookahead** - `peek()` and `peekNext()` for decision making
3. **Location tracking** - Every token has line/column info
4. **Error recovery** - Throw descriptive errors with location
5. **Comment filtering** - Don't include in token stream
6. **Type detection** - Use sets for O(1) keyword/type lookup

---

## 6. Parser Implementation

The parser transforms the token stream into an Abstract Syntax Tree (AST). It uses **recursive descent parsing** with **single-token lookahead**.

### 6.1 AST Node Types

First, define the AST structure:

```typescript
// src/ast/types.ts

export interface DecoratorNode {
  name: string;       // 'pk', 'unique', 'ref', 'onDelete'
  args?: string[];    // ['User.id'] for @ref(User.id)
}

export interface ColumnNode {
  name: string;              // 'id', 'email'
  type: string;              // 'Serial', 'VarChar'
  typeArgs?: string[];       // ['255'] for VarChar(255)
  decorators: DecoratorNode[];
}

export interface ModelNode {
  name: string;              // 'User', 'Post'
  columns: ColumnNode[];
}

export interface RawSqlNode {
  sql: string;               // Raw SQL statement
}

export interface SchemaAST {
  models: ModelNode[];
  rawSql: RawSqlNode[];
}
```

### 6.2 Parser Class Structure

```typescript
// src/ast/parser.ts

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // Static factory method for convenience
  static parse(input: string): SchemaAST {
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parseSchema();
  }

  parseSchema(): SchemaAST {
    const models: ModelNode[] = [];
    const rawSql: RawSqlNode[] = [];

    while (!this.isAtEnd()) {
      // Skip newlines at schema level
      if (this.check('NEWLINE')) {
        this.advance();
        continue;
      }

      if (this.check('MODEL')) {
        models.push(this.parseModel());
      } else if (this.check('RAW_SQL')) {
        rawSql.push(this.parseRawSql());
      } else if (!this.check('EOF')) {
        const token = this.peek();
        throw new ParseError(
          `Unexpected token: ${token.value} (${token.type})`,
          token.line,
          token.column
        );
      } else {
        break;
      }
    }

    return { models, rawSql };
  }
}
```

### 6.3 Core Helper Methods

```typescript
// Check if at end of tokens
private isAtEnd(): boolean {
  return this.peek().type === 'EOF';
}

// Get current token without consuming
private peek(): Token {
  if (this.current >= this.tokens.length) {
    // Safety: return EOF token if out of bounds
    return {
      type: 'EOF',
      value: '',
      line: this.tokens[this.tokens.length - 1]?.line || 1,
      column: this.tokens[this.tokens.length - 1]?.column || 1,
    };
  }
  return this.tokens[this.current];
}

// Get previous token
private previous(): Token {
  return this.tokens[this.current - 1];
}

// Consume and return current token
private advance(): Token {
  if (!this.isAtEnd()) {
    this.current++;
  }
  return this.previous();
}

// Check if current token matches type
private check(type: TokenType): boolean {
  if (this.isAtEnd()) return false;
  return this.peek().type === type;
}

// Consume token if it matches, otherwise throw
private consume(type: TokenType, message: string): Token {
  if (this.check(type)) return this.advance();

  const token = this.peek();
  throw new ParseError(message, token.line, token.column);
}
```

### 6.4 Parsing Models

```typescript
private parseModel(): ModelNode {
  // Consume 'model' keyword
  this.consume('MODEL', 'Expected "model" keyword');

  // Get model name
  const nameToken = this.consume('IDENTIFIER', 'Expected model name');
  const name = nameToken.value;

  // Consume opening brace
  this.consume('LBRACE', 'Expected "{" after model name');

  // Parse columns
  const columns: ColumnNode[] = [];
  while (!this.check('RBRACE') && !this.isAtEnd()) {
    // Skip newlines inside model
    if (this.check('NEWLINE')) {
      this.advance();
      continue;
    }
    columns.push(this.parseColumn());
  }

  // Consume closing brace
  this.consume('RBRACE', 'Expected "}" to close model block');

  // Validation: Models must have at least one column
  if (columns.length === 0) {
    throw new ParseError(
      `Model "${name}" must have at least one column`,
      nameToken.line,
      nameToken.column
    );
  }

  return { name, columns };
}
```

### 6.5 Parsing Columns with Duplicate Detection

```typescript
private parseColumn(): ColumnNode {
  // Column name
  const nameToken = this.consume('IDENTIFIER', 'Expected column name');
  const name = nameToken.value;

  // Column type
  const typeToken = this.consume('TYPE', 'Expected column type');
  const type = typeToken.value;

  // Optional type arguments: VarChar(255), Enum(admin, user)
  let typeArgs: string[] | undefined;
  if (this.check('LPAREN')) {
    typeArgs = this.parseTypeArgs();
  }

  // Parse decorators with duplicate detection
  const decorators: DecoratorNode[] = [];
  const seenDecorators = new Set<string>();

  while (this.check('DECORATOR')) {
    const decorator = this.parseDecorator();

    // Check for duplicates
    if (seenDecorators.has(decorator.name)) {
      throw new ParseError(
        `Duplicate decorator @${decorator.name} on column "${name}". ` +
        `Each decorator can only be used once per column.`,
        this.previous().line,
        this.previous().column
      );
    }

    seenDecorators.add(decorator.name);
    decorators.push(decorator);
  }

  return { name, type, typeArgs, decorators };
}
```

### 6.6 Parsing Type Arguments

Type arguments handle:
- `VarChar(255)` → `['255']`
- `Decimal(10, 2)` → `['10', '2']`
- `Enum(admin, user, guest)` → `['admin', 'user', 'guest']`

```typescript
private parseTypeArgs(): string[] {
  this.consume('LPAREN', 'Expected "("');

  const args: string[] = [];

  if (!this.check('RPAREN')) {
    do {
      // Arguments can be strings, numbers, or identifiers
      if (this.check('STRING')) {
        args.push(this.advance().value);
      } else if (this.check('NUMBER')) {
        args.push(this.advance().value);
      } else if (this.check('IDENTIFIER')) {
        args.push(this.advance().value);
      } else {
        const token = this.peek();
        throw new ParseError(
          `Expected argument value, got ${token.type}`,
          token.line,
          token.column
        );
      }

      // Check for comma (more arguments)
      if (this.check('COMMA')) {
        this.advance();
      } else {
        break;
      }
    } while (!this.check('RPAREN') && !this.isAtEnd());
  }

  this.consume('RPAREN', 'Expected ")" after type arguments');

  return args;
}
```

### 6.7 Parsing Decorators with Dot Notation

Decorator arguments support dot notation for foreign key references:
- `@ref(User.id)` → `{ name: 'ref', args: ['User.id'] }`

```typescript
private parseDecorator(): DecoratorNode {
  const decoratorToken = this.consume('DECORATOR', 'Expected decorator');
  const name = decoratorToken.value;

  let args: string[] | undefined;

  // Check for arguments
  if (this.check('LPAREN')) {
    args = this.parseDecoratorArgs();
  }

  return { name, args };
}

private parseDecoratorArgs(): string[] {
  this.consume('LPAREN', 'Expected "("');

  const args: string[] = [];

  if (!this.check('RPAREN')) {
    do {
      if (this.check('STRING')) {
        args.push(this.advance().value);
      } else if (this.check('NUMBER')) {
        args.push(this.advance().value);
      } else if (this.check('IDENTIFIER')) {
        let value = this.advance().value;

        // Handle dot notation: User.id
        if (this.check('DOT')) {
          this.advance();  // Consume DOT
          if (this.check('IDENTIFIER')) {
            value += '.' + this.advance().value;
          } else {
            throw new ParseError(
              'Expected identifier after dot in reference',
              this.peek().line,
              this.peek().column
            );
          }
        }

        args.push(value);
      } else {
        const token = this.peek();
        throw new ParseError(
          `Expected decorator argument, got ${token.type}`,
          token.line,
          token.column
        );
      }

      if (this.check('COMMA')) {
        this.advance();
      } else {
        break;
      }
    } while (!this.check('RPAREN') && !this.isAtEnd());
  }

  this.consume('RPAREN', 'Expected ")" after decorator arguments');

  return args;
}
```

### 6.8 Parsing Raw SQL

```typescript
private parseRawSql(): RawSqlNode {
  const sqlToken = this.consume('RAW_SQL', 'Expected raw SQL');
  return { sql: sqlToken.value };
}
```

### 6.9 Complete Parsing Example

**Input:**
```sigl
model User {
  id Serial @pk
  email VarChar(255) @unique @notnull
  role Enum(admin, user) @default(user)
}

model Post {
  id Serial @pk
  authorId Int @ref(User.id) @onDelete(CASCADE)
}

> CREATE INDEX idx_posts_author ON "Post"("authorId");
```

**Output AST:**
```javascript
{
  models: [
    {
      name: 'User',
      columns: [
        {
          name: 'id',
          type: 'Serial',
          typeArgs: undefined,
          decorators: [{ name: 'pk', args: undefined }]
        },
        {
          name: 'email',
          type: 'VarChar',
          typeArgs: ['255'],
          decorators: [
            { name: 'unique', args: undefined },
            { name: 'notnull', args: undefined }
          ]
        },
        {
          name: 'role',
          type: 'Enum',
          typeArgs: ['admin', 'user'],
          decorators: [{ name: 'default', args: ['user'] }]
        }
      ]
    },
    {
      name: 'Post',
      columns: [
        {
          name: 'id',
          type: 'Serial',
          typeArgs: undefined,
          decorators: [{ name: 'pk', args: undefined }]
        },
        {
          name: 'authorId',
          type: 'Int',
          typeArgs: undefined,
          decorators: [
            { name: 'ref', args: ['User.id'] },
            { name: 'onDelete', args: ['CASCADE'] }
          ]
        }
      ]
    }
  ],
  rawSql: [
    { sql: 'CREATE INDEX idx_posts_author ON "Post"("authorId");' }
  ]
}
```

### 6.10 Parser Testing

```javascript
// tests/parser.test.js

describe('Parser', () => {
  it('parses simple model', () => {
    const ast = Parser.parse('model User { id Serial @pk }');

    expect(ast.models).toHaveLength(1);
    expect(ast.models[0].name).toBe('User');
    expect(ast.models[0].columns).toHaveLength(1);
  });

  it('parses type arguments', () => {
    const ast = Parser.parse('model User { name VarChar(100) }');

    const column = ast.models[0].columns[0];
    expect(column.type).toBe('VarChar');
    expect(column.typeArgs).toEqual(['100']);
  });

  it('parses foreign key references', () => {
    const ast = Parser.parse(`
      model Post {
        authorId Int @ref(User.id) @onDelete(CASCADE)
      }
    `);

    const column = ast.models[0].columns[0];
    const refDecorator = column.decorators.find(d => d.name === 'ref');

    expect(refDecorator.args).toEqual(['User.id']);
  });

  it('throws on empty model', () => {
    expect(() => Parser.parse('model Empty { }')).toThrow(
      'must have at least one column'
    );
  });

  it('throws on duplicate decorators', () => {
    expect(() => Parser.parse('model User { id Serial @pk @pk }')).toThrow(
      'Duplicate decorator'
    );
  });
});
```

---

## 7. Type System & AST Definitions

### 7.1 Complete Type Definitions

```typescript
// src/ast/types.ts

// ==================== TOKEN TYPES ====================

export type TokenType =
  | 'MODEL'
  | 'IDENTIFIER'
  | 'TYPE'
  | 'DECORATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACE'
  | 'RBRACE'
  | 'COMMA'
  | 'DOT'
  | 'STRING'
  | 'NUMBER'
  | 'COMMENT'
  | 'RAW_SQL'
  | 'NEWLINE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// ==================== AST TYPES ====================

export interface DecoratorNode {
  name: string;
  args?: string[];
}

export interface ColumnNode {
  name: string;
  type: string;
  typeArgs?: string[];
  decorators: DecoratorNode[];
}

export interface ModelNode {
  name: string;
  columns: ColumnNode[];
}

export interface RawSqlNode {
  sql: string;
}

export interface SchemaAST {
  models: ModelNode[];
  rawSql: RawSqlNode[];
}

// ==================== ERROR TYPES ====================

export class SchemactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemactError';
  }
}

export class ParseError extends SchemactError {
  constructor(message: string, line?: number, column?: number) {
    const location =
      line !== undefined && column !== undefined
        ? ` at line ${line}, column ${column}`
        : '';
    super(`Parse error${location}: ${message}`);
    this.name = 'ParseError';
  }
}

export class GeneratorError extends SchemactError {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

export class IntegrityError extends SchemactError {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityError';
  }
}

// ==================== DATABASE ADAPTER ====================

export interface DbAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string): Promise<any[]>;
  transaction(queries: string[]): Promise<void>;
}

// ==================== LEDGER TYPES ====================

export interface LedgerEntry {
  filename: string;
  hash: string;           // SHA-256 hash
  appliedAt: string;      // ISO 8601 timestamp
  batch: number;
}

export interface Ledger {
  migrations: LedgerEntry[];
  currentBatch: number;
}

// ==================== CONFIGURATION ====================

export interface SchemactConfig {
  adapter: DbAdapter;
  generator?: SqlGenerator;
  migrationsPath?: string;
  ledgerPath?: string;

  // Security
  maxMigrationFileSize?: number;
  maxTotalMigrationsSize?: number;
  enableFileSizeValidation?: boolean;

  // Concurrency
  lockTimeout?: number;
  lockRetryDelay?: number;

  // Logging
  logging?: {
    console?: boolean;
    file?: string | null;
    level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
    auditTrail?: boolean;
  };

  // Metrics
  metrics?: {
    onMigrationComplete?: (event: MigrationMetricEvent) => void | Promise<void>;
  };
}

export interface MigrationMetricEvent {
  filename: string;
  operation: 'up' | 'down';
  duration: number;
  sqlStatements: number;
  success: boolean;
  batch: number;
}
```

### 7.2 Type-Safe AST Traversal

Helper functions for working with the AST:

```typescript
// Find a model by name
function findModel(ast: SchemaAST, name: string): ModelNode | undefined {
  return ast.models.find(m => m.name === name);
}

// Find a column by name in a model
function findColumn(model: ModelNode, name: string): ColumnNode | undefined {
  return model.columns.find(c => c.name === name);
}

// Check if column has a specific decorator
function hasDecorator(column: ColumnNode, name: string): boolean {
  return column.decorators.some(d => d.name === name);
}

// Get decorator arguments
function getDecoratorArgs(column: ColumnNode, name: string): string[] | undefined {
  const decorator = column.decorators.find(d => d.name === name);
  return decorator?.args;
}

// Parse foreign key reference
function parseRef(refArg: string): { table: string; column: string } {
  const [table, column] = refArg.split('.');
  return { table, column };
}
```

### 7.3 Why This Type System?

**Benefits:**

1. **Compile-time safety** - TypeScript catches type errors
2. **Self-documenting** - Types describe data shape
3. **IDE support** - Autocomplete and inline docs
4. **Refactoring safety** - Rename refactoring works

**Design Choices:**

1. **Optional arrays** - `typeArgs?: string[]` vs `typeArgs: string[] | undefined`
2. **Discriminated unions** - Could use for token types
3. **Interface vs Type** - Interfaces for extendability

---

## 8. SQL Generators

SQL generators transform the AST into database-specific SQL DDL statements. Each database has its own generator implementing the `SqlGenerator` interface.

### 8.1 Generator Interface

```typescript
// src/generators/base.ts

export interface SqlGenerator {
  /**
   * Generate SQL statements for creating tables (UP migration)
   */
  generateUp(ast: SchemaAST): string[];

  /**
   * Generate SQL statements for dropping tables (DOWN migration)
   */
  generateDown(ast: SchemaAST): string[];
}

export interface GeneratedMigration {
  up: string[];
  down: string[];
}
```

**Design Pattern:** Strategy Pattern - each database is a concrete strategy.

### 8.2 PostgreSQL Generator

```typescript
// src/generators/postgres.ts

export class PostgresGenerator implements SqlGenerator {

  generateUp(ast: SchemaAST): string[] {
    const statements: string[] = [];

    // Generate CREATE TABLE for each model
    for (const model of ast.models) {
      statements.push(this.generateCreateTable(model));
    }

    // Add raw SQL passthrough
    for (const raw of ast.rawSql) {
      statements.push(raw.sql);
    }

    return statements;
  }

  generateDown(ast: SchemaAST): string[] {
    const statements: string[] = [];

    // Drop tables in REVERSE order (handle dependencies)
    for (let i = ast.models.length - 1; i >= 0; i--) {
      const model = ast.models[i];
      const tableName = escapePostgresIdentifier(model.name);
      statements.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
    }

    return statements;
  }

  private generateCreateTable(model: ModelNode): string {
    const lines: string[] = [];
    const tableName = escapePostgresIdentifier(model.name);

    lines.push(`CREATE TABLE ${tableName} (`);

    const columnDefs: string[] = [];
    const constraints: string[] = [];

    for (const column of model.columns) {
      const { columnDef, constraint } = this.generateColumn(column, model.name);
      columnDefs.push(columnDef);
      if (constraint) {
        constraints.push(constraint);
      }
    }

    // Combine column definitions and constraints
    const allDefs = [...columnDefs, ...constraints];
    lines.push(allDefs.map(def => `  ${def}`).join(',\n'));
    lines.push(');');

    return lines.join('\n');
  }
}
```

### 8.3 Type Mapping

Each database has different type syntax:

```typescript
// PostgreSQL Type Mapping
private mapType(type: string, args?: string[]): string {
  switch (type) {
    case 'Serial':
      return 'SERIAL';
    case 'Int':
      return 'INTEGER';
    case 'BigInt':
      return 'BIGINT';
    case 'SmallInt':
      return 'SMALLINT';
    case 'VarChar':
      return args ? `VARCHAR(${args[0]})` : 'VARCHAR(255)';
    case 'Char':
      return args ? `CHAR(${args[0]})` : 'CHAR(1)';
    case 'Text':
      return 'TEXT';
    case 'Boolean':
      return 'BOOLEAN';
    case 'Timestamp':
      return 'TIMESTAMP';
    case 'Date':
      return 'DATE';
    case 'Time':
      return 'TIME';
    case 'Decimal':
    case 'Numeric':
      if (args && args.length >= 2) {
        return `NUMERIC(${args[0]}, ${args[1]})`;
      }
      return 'NUMERIC(10, 2)';  // Default precision
    case 'Real':
      return 'REAL';
    case 'DoublePrecision':
      return 'DOUBLE PRECISION';
    case 'Json':
      return 'JSON';
    case 'Jsonb':
      return 'JSONB';
    case 'Uuid':
      return 'UUID';
    default:
      throw new GeneratorError(`Unknown type: ${type}`);
  }
}
```

### 8.4 Database Type Comparison

| DSL Type | PostgreSQL | MySQL | SQLite |
|----------|------------|-------|--------|
| `Serial` | `SERIAL` | `INT AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `Int` | `INTEGER` | `INT` | `INTEGER` |
| `BigInt` | `BIGINT` | `BIGINT` | `INTEGER` |
| `VarChar(n)` | `VARCHAR(n)` | `VARCHAR(n)` | `TEXT` |
| `Boolean` | `BOOLEAN` | `BOOLEAN` | `INTEGER` |
| `Timestamp` | `TIMESTAMP` | `TIMESTAMP` | `TEXT` |
| `Decimal(p,s)` | `NUMERIC(p,s)` | `DECIMAL(p,s)` | `REAL` |
| `Json` | `JSON` | `JSON` | `TEXT` |
| `Jsonb` | `JSONB` | `JSON` | `TEXT` |
| `Uuid` | `UUID` | `CHAR(36)` | `TEXT` |
| `Enum(...)` | `VARCHAR + CHECK` | `ENUM(...)` | `TEXT + CHECK` |

### 8.5 Handling Enums

Each database handles enums differently:

```typescript
// PostgreSQL: VARCHAR with CHECK constraint
case 'Enum':
  const values = args.map(v => escapeSqlStringLiteral(v)).join(', ');
  const checkCol = escapePostgresIdentifier(columnName);
  return `VARCHAR(50) CHECK (${checkCol} IN (${values}))`;

// MySQL: Native ENUM type
case 'Enum':
  const values = args.map(v => escapeSqlStringLiteral(v)).join(', ');
  return `ENUM(${values})`;

// SQLite: TEXT with CHECK constraint
case 'Enum':
  // Type is TEXT, CHECK added separately
  return 'TEXT';
```

### 8.6 Generating Column Definitions

```typescript
private generateColumn(
  column: ColumnNode,
  modelName: string
): { columnDef: string; constraint: string | null } {
  const parts: string[] = [];
  let constraint: string | null = null;

  // Column name
  const columnName = escapePostgresIdentifier(column.name);
  parts.push(columnName);

  // Column type
  parts.push(this.mapType(column.type, column.typeArgs));

  // Process decorators
  for (const decorator of column.decorators) {
    switch (decorator.name) {
      case 'pk':
        parts.push('PRIMARY KEY');
        break;

      case 'unique':
        parts.push('UNIQUE');
        break;

      case 'notnull':
        parts.push('NOT NULL');
        break;

      case 'default':
        if (!decorator.args || decorator.args.length === 0) {
          throw new GeneratorError(
            `@default requires a value on column "${modelName}.${column.name}"`
          );
        }
        parts.push(`DEFAULT ${this.formatDefaultValue(decorator.args[0])}`);
        break;

      case 'ref':
        // Foreign key - generates constraint
        if (!decorator.args || decorator.args.length === 0) {
          throw new GeneratorError(
            `@ref requires table.column reference on "${modelName}.${column.name}"`
          );
        }
        const [refTable, refColumn] = decorator.args[0].split('.');
        const onDeleteDecorator = column.decorators.find(d => d.name === 'onDelete');
        const onDelete = onDeleteDecorator?.args?.[0];

        constraint = this.generateForeignKey(
          column.name,
          refTable,
          refColumn,
          onDelete
        );
        break;

      case 'onDelete':
        // Handled with @ref
        break;

      default:
        throw new GeneratorError(`Unknown decorator: @${decorator.name}`);
    }
  }

  return {
    columnDef: parts.join(' '),
    constraint,
  };
}
```

### 8.7 Foreign Key Constraints

```typescript
private generateForeignKey(
  columnName: string,
  refTable: string,
  refColumn: string,
  onDelete?: string
): string {
  const safeColumnName = escapePostgresIdentifier(columnName);
  const safeRefTable = escapePostgresIdentifier(refTable);
  const safeRefColumn = escapePostgresIdentifier(refColumn);

  let fk = `FOREIGN KEY (${safeColumnName}) REFERENCES ${safeRefTable}(${safeRefColumn})`;

  if (onDelete) {
    const action = onDelete.toUpperCase();
    // Validate action
    const validActions = ['CASCADE', 'SET NULL', 'SET DEFAULT', 'RESTRICT', 'NO ACTION'];
    if (!validActions.includes(action)) {
      throw new GeneratorError(`Invalid ON DELETE action: ${onDelete}`);
    }
    fk += ` ON DELETE ${action}`;
  }

  return fk;
}
```

### 8.8 Default Value Formatting

```typescript
private formatDefaultValue(value: string): string {
  // Special keywords
  if (value.toLowerCase() === 'now') {
    return 'CURRENT_TIMESTAMP';
  }

  // Boolean handling (database-specific)
  if (value.toLowerCase() === 'true') {
    return 'true';      // PostgreSQL
    // return '1';      // MySQL/SQLite
  }
  if (value.toLowerCase() === 'false') {
    return 'false';     // PostgreSQL
    // return '0';      // MySQL/SQLite
  }

  // Numeric literals (no quotes)
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }

  // String literals (with quotes)
  return escapeSqlStringLiteral(value);
}
```

### 8.9 MySQL Generator Specifics

MySQL has unique requirements:

```typescript
// src/generators/mysql.ts

export interface MySQLGeneratorOptions {
  engine?: string;      // Default: 'InnoDB'
  charset?: string;     // Default: 'utf8mb4'
  collation?: string;   // Default: 'utf8mb4_unicode_ci'
}

export class MySQLGenerator implements SqlGenerator {
  private options: Required<MySQLGeneratorOptions>;

  constructor(options?: MySQLGeneratorOptions) {
    this.options = {
      engine: options?.engine ?? 'InnoDB',
      charset: options?.charset ?? 'utf8mb4',
      collation: options?.collation ?? 'utf8mb4_unicode_ci',
    };
  }

  private generateCreateTable(model: ModelNode): string {
    // ... column generation ...

    // MySQL-specific table options
    lines.push(
      `) ENGINE=${this.options.engine} ` +
      `DEFAULT CHARSET=${this.options.charset} ` +
      `COLLATE=${this.options.collation};`
    );

    return lines.join('\n');
  }
}
```

**MySQL PRIMARY KEY ordering:**

```typescript
// MySQL requires AUTO_INCREMENT before PRIMARY KEY
case 'Serial':
  return 'INT AUTO_INCREMENT';  // PRIMARY KEY added after

// Column generation
if (isPrimaryKey) {
  parts.push('PRIMARY KEY');  // Must come AFTER AUTO_INCREMENT
}
```

### 8.10 SQLite Generator Specifics

SQLite has dynamic typing and unique constraints:

```typescript
// src/generators/sqlite.ts

export class SQLiteGenerator implements SqlGenerator {

  generateUp(ast: SchemaAST): string[] {
    const statements: string[] = [];

    // CRITICAL: Enable foreign keys (disabled by default in SQLite)
    statements.push('PRAGMA foreign_keys = ON;');

    for (const model of ast.models) {
      statements.push(this.generateCreateTable(model));
    }

    for (const raw of ast.rawSql) {
      statements.push(raw.sql);
    }

    return statements;
  }

  // SQLite type affinity (only 5 types)
  private mapType(type: string): string {
    switch (type) {
      case 'Serial':
      case 'Int':
      case 'BigInt':
      case 'SmallInt':
      case 'Boolean':
        return 'INTEGER';

      case 'VarChar':
      case 'Char':
      case 'Text':
      case 'Timestamp':
      case 'Date':
      case 'Time':
      case 'Json':
      case 'Jsonb':
      case 'Uuid':
      case 'Enum':
        return 'TEXT';

      case 'Decimal':
      case 'Numeric':
      case 'Real':
      case 'DoublePrecision':
        return 'REAL';

      default:
        return 'TEXT';
    }
  }
}
```

### 8.11 Identifier Escaping

Each database uses different quote characters:

```typescript
// PostgreSQL: Double quotes
export function escapePostgresIdentifier(identifier: string): string {
  const validated = escapeSqlIdentifier(identifier, 'PostgreSQL identifier');
  const escaped = validated.replace(/"/g, '""');
  return `"${escaped}"`;
}

// MySQL: Backticks
export function escapeMySQLIdentifier(identifier: string): string {
  const validated = escapeSqlIdentifier(identifier, 'MySQL identifier');
  const escaped = validated.replace(/`/g, '``');
  return `\`${escaped}\``;
}

// SQLite: Double quotes (same as PostgreSQL)
// Reuses escapePostgresIdentifier
```

### 8.12 Complete Generation Example

**Input DSL:**
```sigl
model User {
  id Serial @pk
  email VarChar(255) @unique @notnull
  role Enum(admin, user) @default(user)
}

model Post {
  id Serial @pk
  authorId Int @ref(User.id) @onDelete(CASCADE)
  title VarChar(255) @notnull
}
```

**PostgreSQL Output:**
```sql
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "role" VARCHAR(50) CHECK ("role" IN ('admin', 'user')) DEFAULT 'user'
);

CREATE TABLE "Post" (
  "id" SERIAL PRIMARY KEY,
  "authorId" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- DOWN:
DROP TABLE IF EXISTS "Post" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
```

**MySQL Output:**
```sql
CREATE TABLE `User` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `role` ENUM('admin', 'user') DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Post` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `authorId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**SQLite Output:**
```sql
PRAGMA foreign_keys = ON;

CREATE TABLE "User" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "email" TEXT UNIQUE NOT NULL,
  "role" TEXT CHECK ("role" IN ('admin', 'user')) DEFAULT 'user'
);

CREATE TABLE "Post" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "authorId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE
);
```

### 8.13 Generator Testing

```javascript
// tests/postgres-generator.test.js

describe('PostgresGenerator', () => {
  const generator = new PostgresGenerator();

  it('generates CREATE TABLE', () => {
    const ast = Parser.parse('model User { id Serial @pk }');
    const sql = generator.generateUp(ast);

    expect(sql[0]).toContain('CREATE TABLE "User"');
    expect(sql[0]).toContain('"id" SERIAL PRIMARY KEY');
  });

  it('handles foreign keys', () => {
    const ast = Parser.parse(`
      model Post {
        authorId Int @ref(User.id) @onDelete(CASCADE)
      }
    `);
    const sql = generator.generateUp(ast);

    expect(sql[0]).toContain('FOREIGN KEY ("authorId")');
    expect(sql[0]).toContain('REFERENCES "User"("id")');
    expect(sql[0]).toContain('ON DELETE CASCADE');
  });

  it('drops tables in reverse order', () => {
    const ast = Parser.parse(`
      model User { id Serial @pk }
      model Post { id Serial @pk }
    `);
    const sql = generator.generateDown(ast);

    expect(sql[0]).toContain('"Post"');  // Post dropped first
    expect(sql[1]).toContain('"User"');  // User dropped second
  });
});
```

### 8.14 Key Takeaways

1. **Strategy Pattern** - Each database implements `SqlGenerator`
2. **Type mapping** - Database-specific SQL types from DSL types
3. **Identifier escaping** - Prevent SQL injection, handle reserved words
4. **Constraint generation** - PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK
5. **Order matters** - DROP in reverse order for dependencies
6. **Database quirks** - MySQL AUTO_INCREMENT, SQLite PRAGMA, etc.

---

## 9. Engine Layer

The engine layer orchestrates migration execution, state management, and database operations.

### 9.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ENGINE LAYER                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   MigrationRunner                     │  │
│  │  • Load migration files                               │  │
│  │  • Parse DSL → AST                                    │  │
│  │  • Generate SQL                                       │  │
│  │  • Execute in transactions                            │  │
│  │  • Coordinate with Ledger                            │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                  │
│           ┌───────────────┼───────────────┐                 │
│           ▼               ▼               ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Ledger    │  │  DbAdapter  │  │ SqlGenerator│        │
│  │  (State)    │  │ (Database)  │  │   (SQL)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 MigrationRunner

The `MigrationRunner` orchestrates the complete migration lifecycle:

```typescript
// src/engine/runner.ts

export class MigrationRunner {
  private adapter: DbAdapter;
  private generator: SqlGenerator;
  private ledger: LedgerManager;
  private migrationsPath: string;
  private config?: SchemactConfig;

  constructor(options: {
    adapter: DbAdapter;
    generator: SqlGenerator;
    migrationsPath: string;
    ledgerPath?: string;
    config?: SchemactConfig;
  }) {
    this.adapter = options.adapter;
    this.generator = options.generator;
    this.migrationsPath = options.migrationsPath;
    this.ledger = new LedgerManager(
      options.ledgerPath ?? '.schemact_ledger.json',
      options.config
    );
    this.config = options.config;
  }
}
```

### 9.3 Running Migrations (UP)

```typescript
async up(): Promise<{ applied: string[]; skipped: string[] }> {
  const applied: string[] = [];
  const skipped: string[] = [];

  // PHASE 1: Load state and files
  await this.ledger.load();
  const migrations = await this.loadMigrationFiles();

  // PHASE 2: Integrity check
  const migrationMap = new Map(
    migrations.map(m => [m.filename, m.content])
  );
  await this.ledger.validateIntegrity(migrationMap);

  // PHASE 3: Identify pending migrations
  const pendingFiles = this.ledger.getPendingMigrations(
    migrations.map(m => m.filename)
  );

  if (pendingFiles.length === 0) {
    return { applied: [], skipped: [] };
  }

  // PHASE 4: Pre-flight validation
  await this.ledger.validateWriteCapability();
  await validateConnection(this.adapter, { maxRetries: 3 });

  // PHASE 5: Execute migrations
  const toRecord: { filename: string; content: string }[] = [];

  for (const filename of pendingFiles) {
    const migration = migrations.find(m => m.filename === filename);
    if (!migration) {
      throw new SchemactError(`Migration file missing: ${filename}`);
    }

    const startTime = Date.now();

    // Parse → Generate → Execute
    const ast = Parser.parse(migration.content);
    const sqlStatements = this.generator.generateUp(ast);
    await this.adapter.transaction(sqlStatements);

    const duration = Date.now() - startTime;

    // Emit metrics if configured
    if (this.config?.metrics?.onMigrationComplete) {
      await this.config.metrics.onMigrationComplete({
        filename,
        operation: 'up',
        duration,
        sqlStatements: sqlStatements.length,
        success: true,
        batch: this.ledger.getCurrentBatch() + 1,
      });
    }

    toRecord.push({ filename, content: migration.content });
    applied.push(filename);
  }

  // PHASE 6: Record batch atomically
  if (toRecord.length > 0) {
    try {
      await this.ledger.recordBatch(toRecord);
    } catch (error) {
      // Critical: Migrations succeeded but ledger failed
      throw new SchemactError(
        `CRITICAL: Migrations applied but ledger update failed!\n` +
        `Applied: ${applied.join(', ')}\n` +
        `Error: ${(error as Error).message}\n` +
        `DO NOT run migrations again. Manually update ledger.`
      );
    }
  }

  return { applied, skipped };
}
```

### 9.4 Rolling Back Migrations (DOWN)

```typescript
async down(): Promise<{ rolledBack: string[] }> {
  const rolledBack: string[] = [];

  await this.ledger.load();
  const lastBatch = this.ledger.getLastBatchMigrations();

  if (lastBatch.length === 0) {
    return { rolledBack: [] };
  }

  // Pre-flight validation
  await this.ledger.validateWriteCapability();
  await validateConnection(this.adapter);

  const migrations = await this.loadMigrationFiles();

  // Execute rollback in reverse order
  for (const entry of lastBatch.reverse()) {
    const migration = migrations.find(m => m.filename === entry.filename);

    if (!migration) {
      throw new SchemactError(
        `Cannot rollback: migration file "${entry.filename}" not found`
      );
    }

    const ast = Parser.parse(migration.content);
    const sqlStatements = this.generator.generateDown(ast);
    await this.adapter.transaction(sqlStatements);

    rolledBack.push(entry.filename);
  }

  // Update ledger
  await this.ledger.rollbackLastBatch();

  return { rolledBack };
}
```

### 9.5 File Loading with Size Validation

```typescript
private async loadMigrationFiles(): Promise<MigrationFile[]> {
  const migrations: MigrationFile[] = [];

  // Get all .sigl files
  const files = await readdir(this.migrationsPath);
  const siglFiles = files
    .filter(f => f.endsWith('.sigl'))
    .sort();  // Alphabetical order = chronological

  // File size validation (DoS prevention)
  const enableValidation = this.config?.enableFileSizeValidation ?? true;
  const maxFileSize = this.config?.maxMigrationFileSize ?? 5 * 1024 * 1024;
  const maxTotalSize = this.config?.maxTotalMigrationsSize ?? 50 * 1024 * 1024;

  if (enableValidation) {
    const filepaths = siglFiles.map(f => join(this.migrationsPath, f));
    await validateTotalSize(filepaths, maxTotalSize);
  }

  for (const filename of siglFiles) {
    const filepath = join(this.migrationsPath, filename);

    if (enableValidation) {
      await validateFileSize(filepath, maxFileSize);
    }

    const content = await readFile(filepath, 'utf-8');
    migrations.push({ filename, content, filepath });
  }

  return migrations;
}
```

### 9.6 LedgerManager - State Management

The ledger tracks applied migrations with integrity verification:

```typescript
// src/engine/ledger.ts

export class LedgerManager {
  private ledgerPath: string;
  private lockPath: string;
  private ledger: Ledger;
  private lockTimeout: number;
  private lockRetryDelay: number;
  private currentLockId: string | null = null;

  constructor(ledgerPath: string, config?: SchemactConfig) {
    this.ledgerPath = ledgerPath;
    this.lockPath = `${ledgerPath}.lock`;
    this.lockTimeout = config?.lockTimeout ?? 30000;
    this.lockRetryDelay = config?.lockRetryDelay ?? 100;
    this.ledger = { migrations: [], currentBatch: 0 };
  }
}
```

### 9.7 Ledger File Structure

```json
{
  "migrations": [
    {
      "filename": "20240101000000_create_users.sigl",
      "hash": "a1b2c3d4e5f6...",
      "appliedAt": "2024-01-15T10:30:00.000Z",
      "batch": 1
    },
    {
      "filename": "20240101000001_create_posts.sigl",
      "hash": "f6e5d4c3b2a1...",
      "appliedAt": "2024-01-15T10:30:01.000Z",
      "batch": 1
    }
  ],
  "currentBatch": 1
}
```

### 9.8 SHA-256 Integrity Checking

```typescript
import { createHash } from 'crypto';

static computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async validateIntegrity(migrations: Map<string, string>): Promise<void> {
  for (const entry of this.ledger.migrations) {
    const currentContent = migrations.get(entry.filename);

    // Check if file exists
    if (!currentContent) {
      throw new IntegrityError(
        `Migration file "${entry.filename}" is missing.\n` +
        `Applied on: ${entry.appliedAt}\n` +
        `This file cannot be deleted after being applied.`
      );
    }

    // Check if content matches
    const currentHash = LedgerManager.computeHash(currentContent);
    if (currentHash !== entry.hash) {
      throw new IntegrityError(
        `Migration file "${entry.filename}" has been modified!\n` +
        `Expected hash: ${entry.hash}\n` +
        `Current hash:  ${currentHash}\n` +
        `Applied migrations must not be modified.`
      );
    }
  }
}
```

### 9.9 Atomic File Locking

To prevent concurrent migrations (race conditions):

```typescript
interface LockInfo {
  pid: number;
  hostname: string;
  lockId: string;
  acquiredAt: string;
}

private async acquireLock(): Promise<void> {
  const startTime = Date.now();

  while (true) {
    // Check timeout
    if (Date.now() - startTime > this.lockTimeout) {
      throw new IntegrityError(
        `Failed to acquire lock within ${this.lockTimeout}ms.\n` +
        `Another migration may be in progress.`
      );
    }

    // Clean stale locks
    await this.checkAndCleanStaleLock();

    // Generate unique lock ID
    const lockId = randomUUID();
    const tempLockPath = `${this.lockPath}.tmp.${lockId}`;

    const lockInfo: LockInfo = {
      pid: process.pid,
      hostname: hostname(),
      lockId,
      acquiredAt: new Date().toISOString(),
    };

    try {
      // Create temp lock file (fails if exists)
      const handle = await open(tempLockPath, 'wx');
      await handle.writeFile(JSON.stringify(lockInfo));
      await handle.close();

      // Atomic rename (the critical operation)
      await rename(tempLockPath, this.lockPath);

      // Verify we own the lock
      const acquired = await this.verifyLockOwnership(lockId);
      if (acquired) {
        this.currentLockId = lockId;
        return;
      }
    } catch (error: any) {
      // Clean up temp file
      await unlink(tempLockPath).catch(() => {});

      if (error.code === 'EEXIST' || error.code === 'EPERM') {
        // Another process got the lock, retry
        await sleep(this.lockRetryDelay);
        continue;
      }
      throw error;
    }

    await sleep(this.lockRetryDelay);
  }
}
```

### 9.10 Stale Lock Detection

```typescript
private async checkAndCleanStaleLock(): Promise<void> {
  try {
    const lockContent = await readFile(this.lockPath, 'utf-8');
    const lockInfo: LockInfo = JSON.parse(lockContent);

    const lockAge = Date.now() - new Date(lockInfo.acquiredAt).getTime();

    // Only clean if older than timeout
    if (lockAge >= this.lockTimeout) {
      const isDead = await this.isProcessDead(lockInfo.pid, lockInfo.hostname);
      if (isDead) {
        await unlink(this.lockPath).catch(() => {});
      }
    }
  } catch {
    // Lock doesn't exist or is corrupted - safe to proceed
  }
}

private async isProcessDead(pid: number, lockHostname: string): Promise<boolean> {
  // Cross-machine locks are treated as alive (safe)
  if (lockHostname !== hostname()) {
    return false;
  }

  try {
    // Signal 0 checks if process exists
    process.kill(pid, 0);
    return false;  // Process exists
  } catch (error: any) {
    if (error.code === 'ESRCH') {
      return true;  // No such process
    }
    return false;  // Process exists but we can't signal
  }
}
```

### 9.11 Batch Recording

```typescript
async recordBatch(
  migrations: { filename: string; content: string }[]
): Promise<void> {
  if (migrations.length === 0) return;

  await this.acquireLock();

  try {
    const batchNumber = this.ledger.currentBatch + 1;
    const appliedAt = new Date().toISOString();

    // Create entries with same batch number
    const entries: LedgerEntry[] = migrations.map(({ filename, content }) => ({
      filename,
      hash: LedgerManager.computeHash(content),
      appliedAt,
      batch: batchNumber,
    }));

    // Add to ledger
    this.ledger.migrations.push(...entries);
    this.ledger.currentBatch = batchNumber;

    // Atomic save
    await this.save();
  } finally {
    await this.releaseLock();
  }
}

private async save(): Promise<void> {
  const content = JSON.stringify(this.ledger, null, 2);
  await writeFile(this.ledgerPath, content, 'utf-8');
}
```

---

## 10. Database Introspection

Introspectors reverse-engineer existing database schemas into DSL format.

### 10.1 Introspector Interface

```typescript
interface SchemaIntrospector {
  introspect(schema?: string): Promise<string>;
}
```

### 10.2 PostgreSQL Introspector

```typescript
// src/engine/introspector.ts

export class PostgresIntrospector implements SchemaIntrospector {
  constructor(private adapter: DbAdapter) {}

  async introspect(schema: string = 'public'): Promise<string> {
    await validateConnection(this.adapter, { maxRetries: 3 });

    try {
      const tables = await this.getTables(schema);
      const models: string[] = [];

      for (const tableName of tables) {
        const model = await this.introspectTable(tableName, schema);
        models.push(model);
      }

      return models.join('\n\n');
    } finally {
      await this.adapter.disconnect();
    }
  }

  private async getTables(schema: string): Promise<string[]> {
    const safeSchema = escapeSqlStringLiteral(schema);

    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${safeSchema}
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const results = await this.adapter.query(query);
    return results.map((row: any) => row.table_name);
  }
}
```

### 10.3 Column Introspection

```typescript
private async getColumns(tableName: string, schema: string): Promise<ColumnInfo[]> {
  const safeSchema = escapeSqlStringLiteral(schema);
  const safeTable = escapeSqlStringLiteral(tableName);

  const query = `
    SELECT
      column_name,
      data_type,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = ${safeSchema}
      AND table_name = ${safeTable}
    ORDER BY ordinal_position;
  `;

  return await this.adapter.query(query);
}
```

### 10.4 Constraint Introspection

```typescript
private async getConstraints(tableName: string, schema: string): Promise<ConstraintInfo[]> {
  const query = `
    SELECT
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = ${safeSchema}
      AND tc.table_name = ${safeTable};
  `;

  return await this.adapter.query(query);
}
```

### 10.5 Type Mapping (SQL → DSL)

```typescript
private mapSqlTypeToDsl(column: ColumnInfo): string {
  const type = column.data_type.toLowerCase();

  switch (type) {
    case 'integer':
    case 'int':
    case 'int4':
      return 'Int';
    case 'bigint':
    case 'int8':
      return 'BigInt';
    case 'smallint':
    case 'int2':
      return 'SmallInt';
    case 'serial':
      return 'Serial';
    case 'character varying':
    case 'varchar':
      return column.character_maximum_length
        ? `VarChar(${column.character_maximum_length})`
        : 'VarChar(255)';
    case 'text':
      return 'Text';
    case 'boolean':
    case 'bool':
      return 'Boolean';
    case 'timestamp':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
      return 'Timestamp';
    case 'date':
      return 'Date';
    case 'time':
      return 'Time';
    case 'numeric':
    case 'decimal':
      if (column.numeric_precision && column.numeric_scale) {
        return `Decimal(${column.numeric_precision}, ${column.numeric_scale})`;
      }
      return 'Decimal(10, 2)';
    case 'real':
    case 'float4':
      return 'Real';
    case 'double precision':
    case 'float8':
      return 'DoublePrecision';
    case 'json':
      return 'Json';
    case 'jsonb':
      return 'Jsonb';
    case 'uuid':
      return 'Uuid';
    default:
      return 'Text';  // Fallback
  }
}
```

### 10.6 Generating DSL Output

```typescript
private generateModelDsl(tableName: string, columns: ColumnInfo[], constraints: ConstraintInfo[]): string {
  const lines: string[] = [];
  lines.push(`model ${tableName} {`);

  for (const col of columns) {
    const parts: string[] = [];

    // Column name (padded for alignment)
    parts.push(col.column_name.padEnd(15));

    // Type
    parts.push(this.mapSqlTypeToDsl(col).padEnd(20));

    // Decorators
    const decorators: string[] = [];

    // Primary key
    if (constraints.some(c =>
      c.constraint_type === 'PRIMARY KEY' &&
      c.column_name === col.column_name
    )) {
      decorators.push('@pk');
    }

    // Unique
    if (constraints.some(c =>
      c.constraint_type === 'UNIQUE' &&
      c.column_name === col.column_name
    )) {
      decorators.push('@unique');
    }

    // Not null (unless primary key)
    if (col.is_nullable === 'NO' && !decorators.includes('@pk')) {
      decorators.push('@notnull');
    }

    // Foreign key
    const fk = constraints.find(c =>
      c.constraint_type === 'FOREIGN KEY' &&
      c.column_name === col.column_name
    );
    if (fk) {
      decorators.push(`@ref(${fk.foreign_table_name}.${fk.foreign_column_name})`);
    }

    // Default value
    if (col.column_default) {
      const defaultVal = this.parseDefaultValue(col.column_default);
      if (defaultVal) {
        decorators.push(`@default(${defaultVal})`);
      }
    }

    parts.push(decorators.join(' '));
    lines.push(`  ${parts.join(' ').trimEnd()}`);
  }

  lines.push('}');
  return lines.join('\n');
}
```

### 10.7 MySQL Introspector

MySQL uses `information_schema` with slight differences:

```typescript
// src/engine/mysql-introspector.ts

export class MySQLIntrospector implements SchemaIntrospector {
  async introspect(database: string): Promise<string> {
    // Uses information_schema.tables with table_schema = database
    // column_type field contains ENUM values
    // extra field contains AUTO_INCREMENT
  }

  private mapSqlTypeToDsl(column: ColumnInfo): string {
    // Handle MySQL-specific types
    if (column.extra?.includes('auto_increment')) {
      return 'Serial';
    }

    // Extract ENUM values from column_type
    if (column.data_type === 'enum') {
      const match = column.column_type.match(/enum\((.*)\)/i);
      if (match) {
        const values = match[1]; // Already quoted
        return `Enum(${values})`;
      }
    }

    // ... rest of type mapping
  }
}
```

### 10.8 SQLite Introspector

SQLite uses PRAGMA commands:

```typescript
// src/engine/sqlite-introspector.ts

export class SQLiteIntrospector implements SchemaIntrospector {
  async introspect(): Promise<string> {
    // SQLite doesn't have schemas
    const tables = await this.getTables();
    // ...
  }

  private async getTables(): Promise<string[]> {
    const query = `
      SELECT name FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `;
    const results = await this.adapter.query(query);
    return results.map((row: any) => row.name);
  }

  private async getColumns(tableName: string): Promise<ColumnInfo[]> {
    // PRAGMA returns: cid, name, type, notnull, dflt_value, pk
    const query = `PRAGMA table_info("${escapeSqlIdentifier(tableName)}")`;
    return await this.adapter.query(query);
  }

  private async getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
    // Returns: id, seq, table, from, to, on_update, on_delete
    const query = `PRAGMA foreign_key_list("${escapeSqlIdentifier(tableName)}")`;
    return await this.adapter.query(query);
  }
}
```

### 10.9 Introspection Output Example

Running `schemact pull` on an existing database:

```sigl
model User {
  id              Serial          @pk
  email           VarChar(255)    @unique @notnull
  name            VarChar(100)    @notnull
  role            VarChar(50)     @default('user')
  is_active       Boolean         @default(true)
  created_at      Timestamp       @default(now)
}

model Post {
  id              Serial          @pk
  author_id       Int             @ref(User.id) @notnull
  title           VarChar(255)    @notnull
  content         Text
  published       Boolean         @default(false)
  created_at      Timestamp       @default(now)
}
```

---

## 11. CLI Implementation

The CLI provides the user interface for all Schemact operations.

### 11.1 CLI Architecture

```typescript
// src/cli.ts

class SchemactCLI {
  private command: string;
  private commandArgs: string[];

  constructor(args: string[]) {
    this.command = args[0] || 'help';
    this.commandArgs = args.slice(1);
  }

  async run(): Promise<void> {
    try {
      switch (this.command) {
        case 'init':    await this.init(); break;
        case 'create':  await this.create(); break;
        case 'up':      await this.up(); break;
        case 'down':    await this.down(); break;
        case 'status':  await this.status(); break;
        case 'pull':    await this.pull(); break;
        case 'help':
        case '--help':
        case '-h':      this.showHelp(); break;
        case 'version':
        case '--version':
        case '-v':      this.showVersion(); break;
        default:
          console.log(c.error(`Unknown command: ${this.command}`));
          process.exit(1);
      }
    } catch (error) {
      if (error instanceof SchemactError) {
        console.log(c.error(error.message));
        process.exit(1);
      }
      throw error;
    }
  }
}

// Entry point
const args = process.argv.slice(2);
const cli = new SchemactCLI(args);
cli.run().catch(console.error);
```

### 11.2 Command: init

```typescript
private async init(): Promise<void> {
  console.log(c.bold('Initializing Schemact project...'));

  // Create migrations directory
  const migrationsPath = resolve(process.cwd(), 'migrations');
  try {
    await mkdir(migrationsPath, { recursive: true });
    console.log(c.success(`Created migrations directory`));
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      console.log(c.warning('Migrations directory already exists'));
    } else {
      throw new SchemactError(`Failed to create directory: ${error.message}`);
    }
  }

  // Create config file
  const configPath = resolve(process.cwd(), 'schemact.config.js');
  const configContent = `export default {
  adapter: null, // Configure your database adapter
  migrationsPath: './migrations',
  ledgerPath: './.schemact_ledger.json',
};
`;

  try {
    await access(configPath);
    console.log(c.warning('Config file already exists'));
  } catch {
    await writeFile(configPath, configContent, 'utf-8');
    console.log(c.success('Created schemact.config.js'));
  }

  console.log();
  console.log(c.bold('Next steps:'));
  console.log(`  1. Configure your database in ${c.cyan('schemact.config.js')}`);
  console.log(`  2. Run ${c.cyan('schemact create <name>')} to create a migration`);
  console.log(`  3. Run ${c.cyan('schemact up')} to apply migrations`);
}
```

### 11.3 Command: create

```typescript
private async create(): Promise<void> {
  const name = this.commandArgs[0];

  if (!name) {
    throw new SchemactError('Usage: schemact create <name>');
  }

  const config = await this.loadConfig();
  const migrationsPath = resolve(
    process.cwd(),
    config.migrationsPath || './migrations'
  );

  // Security: Validate migration name (prevent path traversal)
  validateMigrationPath(name, migrationsPath);

  // Generate filename with timestamp
  const filename = generateMigrationFilename(name);
  const filepath = join(migrationsPath, filename);

  // Create migration template
  const template = createMigrationTemplate(name);
  await writeFile(filepath, template, 'utf-8');

  console.log(c.success(`Created migration: ${c.cyan(filename)}`));
}
```

### 11.4 Commands: up, down, status

```typescript
private async up(): Promise<void> {
  const config = await this.loadConfig();
  this.validateConfig(config);

  const runner = new MigrationRunner({
    adapter: config.adapter!,
    generator: this.getGenerator(config),
    migrationsPath: resolve(process.cwd(), config.migrationsPath || './migrations'),
    ledgerPath: config.ledgerPath,
    config,
  });

  console.log(c.bold('Running migrations...'));
  const { applied } = await runner.up();

  if (applied.length === 0) {
    console.log(c.info('No pending migrations'));
    return;
  }

  console.log(c.success(`Applied ${applied.length} migration(s):`));
  for (const filename of applied) {
    console.log(`  ${c.green('✓')} ${filename}`);
  }
}

private async down(): Promise<void> {
  // Similar structure, calls runner.down()
}

private async status(): Promise<void> {
  // Calls runner.status() and displays results
}
```

### 11.5 Database Generator Selection

```typescript
private getGenerator(config: SchemactConfig): SqlGenerator {
  // Check for --database flag
  const dbFlagIndex = this.commandArgs.findIndex(
    arg => arg === '--database' || arg === '-d'
  );

  if (dbFlagIndex !== -1) {
    const dbType = this.commandArgs[dbFlagIndex + 1]?.toLowerCase();

    if (!dbType) {
      throw new SchemactError('--database requires a value (postgres, mysql, sqlite)');
    }

    switch (dbType) {
      case 'postgres':
      case 'postgresql':
      case 'pg':
        return new PostgresGenerator();
      case 'mysql':
      case 'mariadb':
        return new MySQLGenerator();
      case 'sqlite':
      case 'sqlite3':
        return new SQLiteGenerator();
      default:
        throw new SchemactError(`Unknown database: ${dbType}`);
    }
  }

  // Use config generator or default to PostgreSQL
  return config.generator ?? new PostgresGenerator();
}
```

---

## 12. Utility Functions

### 12.1 SQL Identifier Escaping

```typescript
// src/utils/sql-identifier-escape.ts

// Database-specific length limits
export const MAX_IDENTIFIER_LENGTH_POSTGRES = 63;
export const MAX_IDENTIFIER_LENGTH_MYSQL = 64;
export const MAX_IDENTIFIER_LENGTH_SQLITE = 256;

export function escapeSqlIdentifier(
  identifier: string,
  type: string = 'identifier',
  maxLength: number = 63
): string {
  if (!identifier || typeof identifier !== 'string') {
    throw new SchemactError(`Invalid ${type}: must be a non-empty string`);
  }

  identifier = identifier.trim();

  // Block dangerous characters (SQL injection prevention)
  const dangerousPattern = /[;'"\\/*#]/;
  if (dangerousPattern.test(identifier)) {
    throw new SchemactError(
      `Invalid ${type}: contains dangerous characters`
    );
  }

  // Must start with letter or underscore
  if (!/^[a-zA-Z_]/.test(identifier)) {
    throw new SchemactError(
      `Invalid ${type}: must start with letter or underscore`
    );
  }

  // Only allow safe characters
  if (!/^[a-zA-Z_][a-zA-Z0-9_.\-]*$/.test(identifier)) {
    throw new SchemactError(
      `Invalid ${type}: contains invalid characters`
    );
  }

  // Length check
  if (identifier.length > maxLength) {
    throw new SchemactError(
      `Invalid ${type}: exceeds ${maxLength} character limit`
    );
  }

  return identifier;
}

export function escapeSqlStringLiteral(value: string): string {
  // SQL standard: double single quotes
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
}
```

### 12.2 Path Validation (Security)

```typescript
// src/utils/path-validator.ts

export function validateMigrationName(name: string): { sanitized: string; safe: boolean } {
  // Decode URL encoding (prevent %2F attacks)
  let decoded = decodeMultipleTimes(name);

  // Unicode normalization (prevent homoglyph attacks)
  decoded = decoded.normalize('NFC');

  decoded = decoded.trim();

  // Whitelist: only alphanumeric, underscore, hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(decoded)) {
    throw new SchemactError(
      `Invalid migration name: only alphanumeric, underscore, hyphen allowed`
    );
  }

  // Length limit
  if (decoded.length > 100) {
    throw new SchemactError(`Migration name too long (max 100 chars)`);
  }

  return { sanitized: decoded, safe: true };
}

export function validateMigrationPath(name: string, migrationsDir: string): string {
  const { sanitized } = validateMigrationName(name);

  const proposedPath = join(migrationsDir, `${sanitized}.sigl`);
  const resolvedPath = resolve(proposedPath);
  const resolvedDir = resolve(migrationsDir);

  // Path traversal check
  if (!resolvedPath.startsWith(resolvedDir + sep)) {
    throw new SchemactError('Path traversal detected');
  }

  // Symlink check
  try {
    const stats = lstatSync(migrationsDir);
    if (stats.isSymbolicLink()) {
      throw new SchemactError('Symlinks not allowed in migrations path');
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }

  return resolvedPath;
}

function decodeMultipleTimes(input: string): string {
  let decoded = input;
  let iterations = 0;

  while (iterations < 5) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      iterations++;
    } catch {
      break;
    }
  }

  return decoded;
}
```

### 12.3 File Size Validation

```typescript
// src/utils/file-validator.ts

export const DEFAULT_MAX_MIGRATION_FILE_SIZE = 5 * 1024 * 1024;  // 5MB
export const DEFAULT_MAX_TOTAL_MIGRATIONS_SIZE = 50 * 1024 * 1024;  // 50MB

export async function validateFileSize(
  filePath: string,
  maxSize: number
): Promise<number> {
  const stats = await stat(filePath);

  if (stats.size > maxSize) {
    throw new FileSizeError(
      `File too large: ${formatBytes(stats.size)} (max: ${formatBytes(maxSize)})`,
      filePath,
      stats.size,
      maxSize
    );
  }

  return stats.size;
}

export async function validateTotalSize(
  filePaths: string[],
  maxTotalSize: number
): Promise<number> {
  let totalSize = 0;

  for (const filePath of filePaths) {
    const stats = await stat(filePath);
    totalSize += stats.size;
  }

  if (totalSize > maxTotalSize) {
    throw new FileSizeError(
      `Total migrations size exceeds limit: ${formatBytes(totalSize)}`,
      '<multiple files>',
      totalSize,
      maxTotalSize
    );
  }

  return totalSize;
}

export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
```

### 12.4 ANSI Colors (Zero-Dependency)

```typescript
// src/utils/colors.ts

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const FG_RED = '\x1b[31m';
const FG_GREEN = '\x1b[32m';
const FG_YELLOW = '\x1b[33m';
const FG_BLUE = '\x1b[34m';
const FG_CYAN = '\x1b[36m';

export const c = {
  reset: (text: string) => `${RESET}${text}${RESET}`,
  bold: (text: string) => `${BOLD}${text}${RESET}`,
  dim: (text: string) => `${DIM}${text}${RESET}`,

  red: (text: string) => `${FG_RED}${text}${RESET}`,
  green: (text: string) => `${FG_GREEN}${text}${RESET}`,
  yellow: (text: string) => `${FG_YELLOW}${text}${RESET}`,
  blue: (text: string) => `${FG_BLUE}${text}${RESET}`,
  cyan: (text: string) => `${FG_CYAN}${text}${RESET}`,

  // Semantic helpers
  success: (text: string) => `${FG_GREEN}✓${RESET} ${text}`,
  error: (text: string) => `${FG_RED}✗${RESET} ${text}`,
  info: (text: string) => `${FG_BLUE}ℹ${RESET} ${text}`,
  warning: (text: string) => `${FG_YELLOW}⚠${RESET} ${text}`,
};
```

### 12.5 Structured Logging

```typescript
// src/utils/logger.ts

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, any>;
  pid: number;
  hostname: string;
}

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;

  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  async log(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      metadata,
      pid: process.pid,
      hostname: hostname(),
    };

    if (this.config.console) {
      this.writeConsole(entry);
    }

    if (this.config.file) {
      await this.writeFile(entry);
    }
  }

  async info(category: string, message: string, metadata?: Record<string, any>) {
    await this.log('INFO', category, message, metadata);
  }

  async security(action: string, details: Record<string, any>) {
    await this.log('SECURITY', 'audit', action, details);
  }
}
```

---

## 13. Security Measures

### 13.1 Security Overview

| Attack Vector | Mitigation | Implementation |
|--------------|------------|----------------|
| SQL Injection | Identifier validation | `sql-identifier-escape.ts` |
| Path Traversal | Canonicalization + whitelist | `path-validator.ts` |
| DoS (file size) | Size limits | `file-validator.ts` |
| Race Conditions | Atomic file locking | `ledger.ts` |
| Data Tampering | SHA-256 integrity | `ledger.ts` |

### 13.2 SQL Injection Prevention

**Approach: Validation, not escaping**

```typescript
// Instead of trying to escape dangerous input:
// BAD: escapeDangerous(userInput)

// We validate that input only contains safe characters:
// GOOD: validateSafeCharacters(userInput)

function escapeSqlIdentifier(identifier: string): string {
  // Reject anything with dangerous characters
  if (/[;'"\\/*#]/.test(identifier)) {
    throw new SchemactError('Dangerous characters detected');
  }

  // Only allow known-safe pattern
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new SchemactError('Invalid identifier format');
  }

  return identifier;
}
```

### 13.3 Path Traversal Prevention

**Multi-layer defense:**

```typescript
// Layer 1: Character whitelist
if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
  throw new Error('Invalid characters');
}

// Layer 2: URL decoding (prevent %2F bypass)
decoded = decodeMultipleTimes(name);

// Layer 3: Unicode normalization (prevent homoglyphs)
decoded = decoded.normalize('NFC');

// Layer 4: Path canonicalization
const resolved = resolve(proposedPath);
if (!resolved.startsWith(allowedDir + sep)) {
  throw new Error('Path traversal detected');
}

// Layer 5: Symlink detection
if (lstatSync(dir).isSymbolicLink()) {
  throw new Error('Symlinks not allowed');
}
```

### 13.4 Denial of Service Prevention

```typescript
// File size limits prevent memory exhaustion
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;  // 50MB total

// Validate BEFORE reading file content
await validateFileSize(filepath, MAX_FILE_SIZE);

// Then read
const content = await readFile(filepath, 'utf-8');
```

### 13.5 Atomic Operations & Race Conditions

```typescript
// Two-phase locking prevents TOCTOU races
async acquireLock() {
  // 1. Create temp file with unique ID
  const tempPath = `${lockPath}.tmp.${uuid()}`;
  await writeFile(tempPath, lockInfo);

  // 2. Atomic rename (OS-level atomicity)
  await rename(tempPath, lockPath);

  // 3. Verify ownership
  const content = await readFile(lockPath);
  if (JSON.parse(content).lockId !== myLockId) {
    // Another process won
    retry();
  }
}
```

### 13.6 Integrity Verification

```typescript
// SHA-256 hash of migration content
const hash = createHash('sha256').update(content).digest('hex');

// Stored in ledger when migration is applied
ledgerEntry = { filename, hash, appliedAt, batch };

// Verified before every migration run
if (computeHash(currentContent) !== storedHash) {
  throw new IntegrityError('Migration file was modified!');
}
```

---

## 14. Testing Strategy

### 14.1 Test Framework

Custom zero-dependency test runner:

```javascript
// tests/test-runner.js

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Deep equality failed`);
      }
    },
    toThrow(message) {
      try {
        actual();
        throw new Error('Expected function to throw');
      } catch (e) {
        if (message && !e.message.includes(message)) {
          throw new Error(`Expected error containing "${message}"`);
        }
      }
    },
    // ... more matchers
  };
}
```

### 14.2 Test Coverage Summary

| Component | Tests | Coverage |
|-----------|-------|----------|
| Lexer | 19 | All token types, error cases |
| Parser | 19 | AST generation, validation |
| PostgreSQL Generator | 39 | All types, constraints |
| MySQL Generator | 38 | MySQL-specific features |
| SQLite Generator | 37 | SQLite quirks |
| Ledger | 17 | State, locking, integrity |
| Utils | 50 | All utility functions |
| Integration | 16 | End-to-end workflows |
| Validators | 32 | Security validation |
| Logger | 20 | Logging system |
| Colors | 16 | ANSI output |
| **Total** | **304** | **100% pass rate** |

### 14.3 Example Tests

```javascript
// Lexer tests
describe('Lexer', () => {
  it('tokenizes model keyword', () => {
    const tokens = new Lexer('model User').tokenize();
    expect(tokens[0].type).toBe('MODEL');
  });

  it('tracks line numbers', () => {
    const tokens = new Lexer('model\nUser').tokenize();
    expect(tokens[1].line).toBe(2);
  });
});

// Parser tests
describe('Parser', () => {
  it('parses complete schema', () => {
    const ast = Parser.parse(`
      model User {
        id Serial @pk
        email VarChar(255) @unique
      }
    `);
    expect(ast.models.length).toBe(1);
    expect(ast.models[0].columns.length).toBe(2);
  });
});

// Generator tests
describe('PostgresGenerator', () => {
  it('generates correct SQL', () => {
    const ast = Parser.parse('model User { id Serial @pk }');
    const sql = new PostgresGenerator().generateUp(ast);
    expect(sql[0]).toContain('CREATE TABLE "User"');
    expect(sql[0]).toContain('SERIAL PRIMARY KEY');
  });
});

// Integration tests
describe('Integration', () => {
  it('full pipeline works', () => {
    const dsl = `
      model User { id Serial @pk }
      model Post { id Serial @pk authorId Int @ref(User.id) }
    `;

    const ast = Parser.parse(dsl);
    const pg = new PostgresGenerator().generateUp(ast);
    const mysql = new MySQLGenerator().generateUp(ast);
    const sqlite = new SQLiteGenerator().generateUp(ast);

    // All three should generate valid SQL
    expect(pg.length).toBe(2);
    expect(mysql.length).toBe(2);
    expect(sqlite.length).toBe(3);  // +1 for PRAGMA
  });
});
```

---

## 15. Lessons Learned

### 15.1 What Worked Well

1. **Zero dependencies** - Maximum portability, no supply chain risk
2. **Three-stage compiler** - Clean separation, easy testing
3. **Strategy pattern for generators** - Easy to add new databases
4. **SHA-256 integrity checking** - Catches accidental modifications
5. **Atomic file locking** - Prevents concurrent migration issues

### 15.2 Challenges Overcome

1. **MySQL AUTO_INCREMENT ordering** - Must come before PRIMARY KEY
2. **SQLite type affinity** - Dynamic typing requires careful handling
3. **Path traversal attacks** - Multiple encoding layers needed
4. **Cross-machine locking** - Process detection across hosts

### 15.3 Future Improvements

1. **Diff-based migrations** - Detect schema changes automatically
2. **Migration squashing** - Combine old migrations
3. **Dry run mode** - Preview SQL without executing
4. **Rollback to specific batch** - More granular control
5. **Schema visualization** - Generate ERD diagrams

### 15.4 Key Takeaways

1. **Start with types** - Define interfaces before implementation
2. **Test each layer** - Catch bugs early in the pipeline
3. **Security by default** - Validate everything, trust nothing
4. **Error messages matter** - Users need actionable guidance
5. **Documentation is code** - Keep them in sync

---

## Appendix: Quick Reference

### A. DSL Syntax

```sigl
model ModelName {
  column_name Type(args) @decorator1 @decorator2(value)
}

> RAW SQL;
```

### B. CLI Commands

```bash
schemact init              # Initialize project
schemact create <name>     # Create migration
schemact up                # Apply migrations
schemact down              # Rollback last batch
schemact status            # Show status
schemact pull [schema]     # Introspect database
```

### C. Configuration

```javascript
// schemact.config.js
export default {
  adapter: yourDbAdapter,
  generator: new PostgresGenerator(),
  migrationsPath: './migrations',
  ledgerPath: './.schemact_ledger.json',
  maxMigrationFileSize: 5 * 1024 * 1024,
  lockTimeout: 30000,
};
```

### D. Decorator Reference

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@pk` | Primary key | `id Serial @pk` |
| `@unique` | Unique constraint | `email VarChar(255) @unique` |
| `@notnull` | NOT NULL | `name Text @notnull` |
| `@default(v)` | Default value | `@default(now)` |
| `@ref(T.c)` | Foreign key | `@ref(User.id)` |
| `@onDelete(a)` | Delete action | `@onDelete(CASCADE)` |

---

**Document Version:** 1.0
**Last Updated:** 2025-11-30
**Total Lines of Code:** ~5,130
**Total Tests:** 304

