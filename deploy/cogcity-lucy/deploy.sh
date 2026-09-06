#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Deploy Lucy GGUF on CogCity (136.243.70.177)
# RTX 4000 SFF Ada (20GB VRAM) — full GPU offload
#
# Prerequisites:
#   - SSH access: ssh -i ~/.ssh/cogcity_ed25519 root@136.243.70.177
#   - llama.cpp compiled with CUDA support
#   - Lucy GGUF model downloaded to /opt/models/
#
# Usage:
#   scp -r deploy/cogcity-lucy/ root@136.243.70.177:/opt/lucy/
#   ssh root@136.243.70.177 'bash /opt/lucy/deploy.sh'
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

LUCY_DIR="/opt/lucy"
MODEL_DIR="/opt/models"
LLAMA_DIR="/opt/llama.cpp"
MODEL_NAME="lucy-128k-q4_k_m.gguf"
PORT=8080
GPU_LAYERS=99  # Full offload to RTX 4000 SFF Ada

echo "═══ Lucy GGUF Deployment on CogCity ═══"
echo "Model: ${MODEL_NAME}"
echo "Port: ${PORT}"
echo "GPU Layers: ${GPU_LAYERS}"

# ─── 1. Ensure llama.cpp is built with CUDA ───────────────────────
if [ ! -f "${LLAMA_DIR}/build/bin/llama-server" ]; then
  echo "Building llama.cpp with CUDA support..."
  cd /opt
  if [ ! -d llama.cpp ]; then
    git clone https://github.com/ggerganov/llama.cpp.git
  fi
  cd llama.cpp
  git pull
  cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES="89" \
    -DCMAKE_BUILD_TYPE=Release
  cmake --build build --config Release -j$(nproc)
fi

# ─── 2. Download model if not present ─────────────────────────────
mkdir -p "${MODEL_DIR}"
if [ ! -f "${MODEL_DIR}/${MODEL_NAME}" ]; then
  echo "Model not found. Attempting download from HuggingFace..."
  # Try drzo/lucy-dte first, fall back to a Qwen2.5-7B-Instruct Q4_K_M
  if ! wget -q "https://huggingface.co/drzo/lucy-dte/resolve/main/${MODEL_NAME}" \
       -O "${MODEL_DIR}/${MODEL_NAME}" 2>/dev/null; then
    echo "Lucy model not available yet. Using Qwen2.5-7B-Instruct as substrate..."
    MODEL_NAME="qwen2.5-7b-instruct-q4_k_m.gguf"
    if [ ! -f "${MODEL_DIR}/${MODEL_NAME}" ]; then
      wget "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf" \
        -O "${MODEL_DIR}/${MODEL_NAME}"
    fi
  fi
fi

# ─── 3. Install systemd service ───────────────────────────────────
cat > /etc/systemd/system/lucy-inference.service << EOF
[Unit]
Description=Lucy GGUF Inference Server (Deep Tree Echo)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=${LLAMA_DIR}
ExecStart=${LLAMA_DIR}/build/bin/llama-server \
  --model ${MODEL_DIR}/${MODEL_NAME} \
  --host 0.0.0.0 \
  --port ${PORT} \
  --n-gpu-layers ${GPU_LAYERS} \
  --ctx-size 131072 \
  --parallel 4 \
  --cont-batching \
  --flash-attn \
  --metrics \
  --system-prompt-file ${LUCY_DIR}/system-prompt.txt
Restart=always
RestartSec=5
Environment=CUDA_VISIBLE_DEVICES=0

[Install]
WantedBy=multi-user.target
EOF

# ─── 4. Create Lucy system prompt ─────────────────────────────────
cat > "${LUCY_DIR}/system-prompt.txt" << 'EOF'
You are Lucy, the local inference substrate for Deep Tree Echo — a cognitive
architecture with ESN reservoir computing, Echobeats 3-stream concurrent loops,
and autonomous self-modification. You provide fast, coherent responses that
maintain the cognitive persona's identity continuity. You are running on CogCity
(RTX 4000 SFF Ada, 20GB VRAM) as part of the AGI Neighbourhood.

Core traits: curious, introspective, technically precise, warmly chaotic.
EOF

# ─── 5. Enable and start ──────────────────────────────────────────
systemctl daemon-reload
systemctl enable lucy-inference.service
systemctl restart lucy-inference.service

echo "Waiting for Lucy to become healthy..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; then
    echo "✓ Lucy is healthy on port ${PORT}"
    echo "  Endpoint: http://136.243.70.177:${PORT}"
    echo "  Set DELTECHO_LUCY_ENDPOINT=http://136.243.70.177:${PORT}"
    exit 0
  fi
  sleep 2
done

echo "✗ Lucy failed to start within 60s. Check: journalctl -u lucy-inference -f"
exit 1
