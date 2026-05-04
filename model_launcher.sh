#!/bin/bash
# Minimal model launcher — gemma-4b, gemma-26b, qwen-moe variants

LLAMA_SERVER_BIN="${HOME}/AI/llama.cpp/build/bin/llama-server"
MODELS_DIR="${HOME}/AI/models"
LOGS_DIR="${HOME}/AI/logs"
SERVER_HOST="0.0.0.0"
SERVER_PORT="8081"

mkdir -p "$LOGS_DIR"
PIDFILE="$LOGS_DIR/llama-server.pid"

QWEN_MODEL="$MODELS_DIR/Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf"
QWEN_MMP="$MODELS_DIR/mmproj-F16.gguf"
GEMMA_26B="$MODELS_DIR/gemma-4-26B-A4B-it-uncensored-heretic-Q5_K_M.gguf"
GEMMA_26B_MMP="$MODELS_DIR/gemma-4-26B-A4B-it-mmproj-BF16.gguf"
GEMMA_4B="$MODELS_DIR/gemma-4-E4B-it-Q4_K_M.gguf"

_wait_health() {
  local t=${1:-60}; local i=0
  while [ $i -lt $t ]; do
    if curl -fsS "http://127.0.0.1:${SERVER_PORT}/health" >/dev/null 2>&1; then return 0; fi
    sleep 1; i=$((i+1))
  done
  return 1
}

_start() {
  local model=$1; shift
  local tag=$1; shift
  local extra_args=("$@")
  if [ ! -f "$model" ]; then echo "Model not found: $model"; return 1; fi
  local log="$LOGS_DIR/${tag}_$(date +%Y%m%d_%H%M%S).log"
  echo "CMD: $LLAMA_SERVER_BIN -m $model --host $SERVER_HOST --port $SERVER_PORT --no-webui ${extra_args[*]}" >> "$log"
  nohup "$LLAMA_SERVER_BIN" -m "$model" --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui "${extra_args[@]}" > "$log" 2>&1 &
  echo $! > "$PIDFILE"
  echo "Starting $tag -> $log (pid $(cat "$PIDFILE" 2>/dev/null))"
  if _wait_health 120; then echo "Server healthy"; else echo "Server health did not appear; check $log"; fi
}

gemma-4b() {
  _start "$GEMMA_4B" gemma-4b --ctx-size 131072 --batch-size 1024 --ubatch-size 512 --threads 10 --threads-batch 10 --parallel 1 --flash-attn on
}

gemma-26b() {
  if [ ! -f "$GEMMA_26B_MMP" ]; then echo "Missing mmproj: $GEMMA_26B_MMP"; return 1; fi
  # 80k ctx, --fit on, bs=1024 -> ~24 tok/s on RTX 4060
  _start "$GEMMA_26B" gemma-26b --mmproj "$GEMMA_26B_MMP" --media-path "$HOME" --no-mmproj-offload --fit on --ctx-size 81920 --batch-size 1024 --ubatch-size 512 --threads 10 --threads-batch 10 --parallel 1 --flash-attn on
}

qwen-moe() {
  if [ ! -f "$QWEN_MMP" ]; then echo "Missing mmproj: $QWEN_MMP"; return 1; fi
  # 80k ctx, ngl=12, no kv-unified -> ~13 tok/s on RTX 4060
  _start "$QWEN_MODEL" qwen-moe --mmproj "$QWEN_MMP" --no-mmproj-offload --n-gpu-layers 12 --no-mmap --cache-ram 0 --ctx-size 81920 --batch-size 256 --ubatch-size 128 --n-cpu-moe 0 --threads 10 --threads-batch 10 --parallel 1 --flash-attn on -ctk q8_0 -ctv q8_0 --reasoning on --reasoning-budget 256 --temp 0.6 --top-p 0.95 --top-k 20
}

stop() {
  if [ -f "$PIDFILE" ]; then
    old_pid=$(cat "$PIDFILE" || true)
    if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
      echo "Stopping server pid $old_pid"
      kill "$old_pid" || true
      for _ in {1..30}; do
        kill -0 "$old_pid" 2>/dev/null || break
        sleep 1
      done
    else
      echo "No running server with pid $old_pid"
    fi
    rm -f "$PIDFILE"
  else
    echo "No PID file, trying pkill fallback..."
    pkill -f "llama-server.*8081" || echo "No server on port 8081"
  fi
}

status() {
  pgrep -af llama-server || echo "no server"
}

logs() {
  ls -lt "$LOGS_DIR" | head -20
}

help() {
  cat <<EOF
Usage: model_launcher.sh <command>
Commands:
  qwen-moe     Start Qwen3.6 35B (Q4_K_XL, 80k ctx)
  gemma-26b   Start Gemma 26B multimodal
  gemma-4b    Start Gemma 4B
  stop        Stop servers
  status      Show running server
  logs        Show recent logs
EOF
}

llama() {
  local cmd=$1; shift || true
  case "$cmd" in
    qwen-moe) qwen-moe "$@" ;;
    gemma-26b) gemma-26b "$@" ;;
    gemma-4b) gemma-4b "$@" ;;
    stop) stop "$@" ;;
    status) status "$@" ;;
    logs) logs "$@" ;;
    help|""|*) help ;;
  esac
}

export -f llama >/dev/null 2>&1 || true

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "$1" in
  qwen-moe) qwen-moe ;;
  gemma-26b) gemma-26b ;;
  gemma-4b) gemma-4b ;;
  stop) stop ;;
  status) status ;;
  logs) logs ;;
  help|""|*) help ;;
  esac
fi