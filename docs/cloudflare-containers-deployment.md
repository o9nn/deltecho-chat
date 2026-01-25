# Cloudflare Containers Deployment Guide

This guide explains how to deploy the DeltEcho Chat browser target to Cloudflare Containers for preview environments.

## Overview

Cloudflare Containers allows running Docker containers on Cloudflare's edge network, controlled by Workers. This setup provides:

- **Full functionality**: The complete browser target with DeltaChat core runs in containers
- **WebSocket support**: Real-time communication for DeltaChat RPC
- **Auto-scaling**: Containers spin up on demand and sleep after inactivity
- **Preview environments**: Each PR can have its own isolated preview

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│  ┌─────────────┐    ┌──────────────────────────────────┐   │
│  │   Worker    │───▶│     Container (Durable Object)    │   │
│  │  (Router)   │    │  ┌────────────────────────────┐  │   │
│  └─────────────┘    │  │   Node.js Server           │  │   │
│        │            │  │   - Express                │  │   │
│        │            │  │   - WebSocket              │  │   │
│        ▼            │  │   - Session Management     │  │   │
│   ┌─────────┐       │  └────────────────────────────┘  │   │
│   │ Session │       │  ┌────────────────────────────┐  │   │
│   │ Cookie  │       │  │   deltachat-rpc-server     │  │   │
│   └─────────┘       │  │   (DeltaChat Core)         │  │   │
│                     │  └────────────────────────────┘  │   │
│                     └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Cloudflare Account** with Workers Paid plan (required for Containers)
2. **Cloudflare API Token** with the following permissions:
   - Account: Workers Scripts (Edit)
   - Account: Workers KV Storage (Edit)
   - Account: Workers Durable Objects (Edit)
   - Zone: Workers Routes (Edit)
3. **GitHub Secrets** configured in your repository

## Setup

### 1. Configure GitHub Secrets

Add the following secrets to your repository:

| Secret Name             | Description                        |
| ----------------------- | ---------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | API token with Workers permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID         |

### 2. Enable Cloudflare Containers Beta

Cloudflare Containers is currently in Beta. You may need to:

1. Join the [Cloudflare Containers Discord](https://discord.gg/cloudflaredev)
2. Request access to the beta program

### 3. Deploy

The deployment happens automatically on:

- Push to `main` branch (production deployment)
- Pull request (preview deployment)
- Manual trigger via workflow dispatch

## Configuration Files

### Dockerfile (`packages/target-browser/Dockerfile`)

Multi-stage Docker build that:

1. Builds the browser target with Node.js
2. Downloads the `deltachat-rpc-server` binary
3. Creates a minimal production image

### Wrangler Config (`packages/target-browser/wrangler.jsonc`)

Cloudflare Workers configuration that defines:

- Container settings (max instances, sleep timeout)
- Durable Object bindings
- Environment variables

### Worker (`packages/target-browser/cloudflare/worker.ts`)

The Worker that:

- Routes requests to container instances
- Manages session-based container routing
- Handles WebSocket upgrades

## Container Lifecycle

1. **Cold Start**: First request to a new session creates a container (~5-10s)
2. **Active**: Container handles requests with low latency
3. **Sleep**: After 30 minutes of inactivity, container sleeps
4. **Wake**: Next request wakes the container (~2-5s)

## Environment Variables

| Variable           | Description                 | Default          |
| ------------------ | --------------------------- | ---------------- |
| `WEB_PORT`         | Port the server listens on  | `8080`           |
| `WEB_PASSWORD`     | Password for authentication | (set via secret) |
| `DC_ACCOUNTS_PATH` | Path to DeltaChat accounts  | `/data/accounts` |
| `USE_HTTP_IN_TEST` | Use HTTP instead of HTTPS   | `true`           |

## Limits

Cloudflare Containers has the following limits:

| Resource        | Limit                              |
| --------------- | ---------------------------------- |
| Max instances   | 10 (configurable)                  |
| Memory          | Up to 4GB                          |
| CPU             | Dedicated vCPU                     |
| Disk            | Ephemeral (use R2 for persistence) |
| Request timeout | 30 seconds                         |

## Persistent Storage

By default, container data is ephemeral. For persistent DeltaChat accounts:

1. **R2 Bucket**: Mount an R2 bucket for account data
2. **Durable Objects Storage**: Use DO SQLite for metadata

See the [Mount R2 buckets with FUSE](https://developers.cloudflare.com/containers/examples/mount-r2-buckets/) example.

## Troubleshooting

### Container fails to start

Check the container logs:

```bash
wrangler tail --env preview
```

### WebSocket connection fails

Ensure the Worker is forwarding WebSocket requests:

```typescript
const upgradeHeader = request.headers.get("Upgrade");
if (upgradeHeader?.toLowerCase() === "websocket") {
  return container.fetch(request);
}
```

### Slow cold starts

Cold starts are expected (~5-10s). Consider:

- Keeping containers warm with periodic requests
- Using smaller Docker images
- Pre-warming containers before demos

## Local Development

Test locally with Wrangler:

```bash
cd packages/target-browser
wrangler dev
```

Note: Local development requires Docker running for container simulation.

## Cost Estimation

Cloudflare Containers pricing (as of Jan 2026):

- **Requests**: Included in Workers Paid plan
- **Container runtime**: Billed per GB-second
- **Container storage**: Billed per GB stored

For preview environments with auto-sleep, costs are minimal as containers only run when actively used.

## References

- [Cloudflare Containers Documentation](https://developers.cloudflare.com/containers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [DeltaChat Core RPC Server](https://github.com/chatmail/core)
