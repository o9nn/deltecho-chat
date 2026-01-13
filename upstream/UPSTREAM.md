# Upstream Source Repositories

This directory contains upstream source repositories integrated into deltecho-chat for reference, repair, and compatibility purposes.

## Included Repositories

| Directory | Source | Description |
|-----------|--------|-------------|
| `deltachat-desktop/` | [deltachat/deltachat-desktop](https://github.com/deltachat/deltachat-desktop) | Original DeltaChat Desktop application |
| `delta-echo-desk/` | [EchoCog/delta-echo-desk](https://github.com/EchoCog/delta-echo-desk) | EchoCog's Deep Tree Echo integration with DeltaChat |
| `deltachat-core/` | [EchoCog/deltachat-core](https://github.com/EchoCog/deltachat-core) | Delta.Chat C-Library with Python bindings |

## Purpose

These upstream sources serve several purposes:

1. **UI Repair**: If any UI components in deltecho-chat are missing or damaged, the original deltachat-desktop source can be used as a reference for repairs.

2. **Integration Reference**: The delta-echo-desk repository contains partial Deep Tree Echo integrations that can inform further development.

3. **Core Library**: The deltachat-core provides the underlying C library and Python bindings for email-based messaging functionality.

## Usage

When repairing or enhancing deltecho-chat:

1. Compare files between `packages/` and `upstream/deltachat-desktop/packages/` to identify differences
2. Reference `upstream/delta-echo-desk/` for existing Deep Tree Echo integration patterns
3. Use `upstream/deltachat-core/` for understanding the core messaging protocol

## Synchronization

To update upstream sources:

```bash
cd upstream/deltachat-desktop && git pull origin main
cd upstream/delta-echo-desk && git pull origin main
cd upstream/deltachat-core && git pull origin main
```

Note: The `.git` directories have been removed from these upstream sources to reduce repository size. Re-clone if updates are needed.

## License

Each upstream repository maintains its own license. See the LICENSE file in each directory for details.
