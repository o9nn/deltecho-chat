# Lucy GGUF Deployment — CogCity

Deploy the Lucy inference substrate on CogCity (136.243.70.177) for Deep Tree Echo.

## Hardware

- **GPU:** NVIDIA RTX 4000 SFF Ada (20GB VRAM)
- **CPU:** Intel i5-13500 (20 threads)
- **RAM:** 64GB DDR5
- **Storage:** 2x1.92TB NVMe RAID1

## Quick Start

```bash
# From CogHood:
scp -i ~/.ssh/cogcity_ed25519 -r deploy/cogcity-lucy/ root@136.243.70.177:/opt/lucy/
ssh -i ~/.ssh/cogcity_ed25519 root@136.243.70.177 'bash /opt/lucy/deploy.sh'
```

## Environment Variable

Set in the DTE orchestrator environment:

```bash
export DELTECHO_LUCY_ENDPOINT=http://136.243.70.177:8080
```

Or in orchestrator config:

```typescript
const orchestrator = new Orchestrator({
  lucyEndpoint: "http://136.243.70.177:8080",
});
```

## Health Check

```bash
curl http://136.243.70.177:8080/health
curl http://136.243.70.177:8080/v1/models
```

## Performance (Expected)

- ~54 tok/s generation (Q4_K_M, full GPU offload)
- 131072 context window
- 4 parallel request slots
- Flash attention enabled

## Model Priority

1. `drzo/lucy-dte` (custom fine-tuned, when available)
2. `Qwen2.5-7B-Instruct-Q4_K_M` (default substrate)
