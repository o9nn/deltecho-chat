# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**⚠️ DEPRECATED:** This is the legacy Delta Chat Core Library written in C. It has been superseded by [deltachat-core-rust](https://github.com/deltachat/deltachat-core-rust).

Delta Chat is a messaging application that uses email as the transport layer. This library provides the core functionality including IMAP/SMTP handling, encryption (Autocrypt), and database management.

## Build System

This project uses **Meson** (version 0.47.2+) with **Ninja** for building.

### Quick Build

```bash
mkdir builddir && cd builddir
meson
ninja
sudo ninja install
sudo ldconfig
```

### Build Options

- `-Dmonolith=true` - Build self-contained shared library with bundled dependencies
- `-Drpgp=true` - Use rpgp instead of bundled netpgp for cryptography
- `--default-library=static` - Build static library
- `--wrap-mode=forcefallback` - Always use bundled dependencies

### Dependencies

- libetpan (≥1.8, or ≥1.6 on macOS)
- OpenSSL
- SQLite3
- zlib
- libsasl2

Install on Debian/Ubuntu:
```bash
sudo apt install libetpan-dev libssl-dev libsqlite3-dev libsasl2-dev libbz2-dev zlib1g-dev
```

## Project Structure

- `src/` - Core C library source files (`dc_*.c`)
- `deltachat/` - Public header file (`deltachat.h`)
- `cmdline/` - Command-line testing program
- `python/` - Python bindings and tests
- `libs/` - Bundled dependencies (netpgp, openssl, sqlite, etc.)
- `ci_scripts/` - Docker and CI build scripts
- `docs/` - Documentation

## Testing

### Python Tests (Primary)

Tests are developed in Python using pytest:

```bash
cd python
pip install -e .
pytest tests/
```

Or using tox:
```bash
cd python
tox
```

### C Command-line Testing

After building:
```bash
./builddir/cmdline/delta <database-file>
# Type 'help' for available commands
```

### Stress Test

```bash
./builddir/cmdline/delta --stress
```

## CI/CD

CI runs via CircleCI using Docker containers:

- `deltachat/coredeps` - Build environment with all dependencies
- `deltachat/doxygen` - Documentation generation

Run CI locally:
```bash
docker pull deltachat/coredeps
DOCS=1 TESTS=1 ci_scripts/ci_run.sh
```

## Key Source Files

- `src/dc_context.c` - Main context/instance management
- `src/dc_imap.c` - IMAP protocol handling
- `src/dc_smtp.c` - SMTP protocol handling
- `src/dc_e2ee.c` - End-to-end encryption (Autocrypt)
- `src/dc_chat.c` - Chat/conversation management
- `src/dc_msg.c` - Message handling
- `src/dc_sqlite3.c` - Database operations
- `src/dc_configure.c` - Account configuration

## License

MPL 2.0 - See LICENSE file
