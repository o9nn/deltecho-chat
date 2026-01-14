#!/usr/bin/env node
/**
 * @fileoverview MCP Server CLI
 *
 * Command-line interface for running the Deep Tree Echo MCP server.
 *
 * Usage:
 *   npx deep-tree-echo-mcp --stdio
 *   npx deep-tree-echo-mcp --http --port 3000
 */

import { parseArgs } from 'util';
import { createNestedMCPServer } from '../server.js';
import { runStdioServer } from '../transport/stdio.js';

interface CLIOptions {
    stdio: boolean;
    verbose: boolean;
    name: string;
    lifecycle: boolean;
    help: boolean;
}

function printHelp(): void {
    console.log(`
Deep Tree Echo MCP Server

A multi-layer nested MCP server implementing the AAR architecture
with the inverted mirror pattern: [ Ao [ Ai [ S ( Vi ( Vo ) ) ] ] ]

USAGE:
    npx deep-tree-echo-mcp [OPTIONS]

OPTIONS:
    --stdio           Run server over stdio (default, for Claude Desktop)
    --name <name>     Instance name (default: DeepTreeEcho)
    --lifecycle       Enable developmental lifecycle
    --verbose, -v     Enable verbose logging
    --help, -h        Show this help message

EXAMPLES:
    # Run for Claude Desktop integration
    npx deep-tree-echo-mcp --stdio

    # Run with custom name and verbose output
    npx deep-tree-echo-mcp --stdio --name MyEcho --verbose

    # Run with lifecycle enabled
    npx deep-tree-echo-mcp --stdio --lifecycle

LAYERS:
    Arena (Ao)    - World context, narrative phases, lore reservoir
    Agent (Ai)    - Character facets, social memory, identity
    Relation (S)  - Self-reflection, cognitive flows, emergent identity
    Virtual (Vi)  - Agent's self-model (contains Vo)
    Virtual (Vo)  - Agent's world-view (inverted mirror)

For more information, see:
    https://github.com/deep-tree-echo/deep-tree-echo-mcp
`);
}

function parseOptions(): CLIOptions {
    try {
        const { values } = parseArgs({
            options: {
                stdio: { type: 'boolean', default: true },
                verbose: { type: 'boolean', short: 'v', default: false },
                name: { type: 'string', default: 'DeepTreeEcho' },
                lifecycle: { type: 'boolean', default: false },
                help: { type: 'boolean', short: 'h', default: false },
            },
            strict: true,
        });

        return {
            stdio: values.stdio ?? true,
            verbose: values.verbose ?? false,
            name: values.name ?? 'DeepTreeEcho',
            lifecycle: values.lifecycle ?? false,
            help: values.help ?? false,
        };
    } catch (error) {
        console.error('Error parsing arguments:', error);
        printHelp();
        process.exit(1);
    }
}

async function main(): Promise<void> {
    const options = parseOptions();

    if (options.help) {
        printHelp();
        process.exit(0);
    }

    if (options.verbose) {
        console.error('[CLI] Starting Deep Tree Echo MCP Server...');
        console.error(`[CLI] Instance: ${options.name}`);
        console.error(`[CLI] Lifecycle: ${options.lifecycle ? 'enabled' : 'disabled'}`);
    }

    try {
        // Create the server
        const server = await createNestedMCPServer({
            instanceName: options.name,
            enableLifecycle: options.lifecycle,
            lifecycleIntervalMs: 0, // Manual cycles for MCP
            verbose: options.verbose,
        });

        if (options.verbose) {
            console.error('[CLI] Server created successfully');
        }

        // Run over stdio (default)
        if (options.stdio) {
            if (options.verbose) {
                console.error('[CLI] Starting stdio transport...');
            }

            await runStdioServer(server, {
                verbose: options.verbose,
            });
        } else {
            console.error('[CLI] Only stdio transport is currently supported');
            process.exit(1);
        }
    } catch (error) {
        console.error('[CLI] Fatal error:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
