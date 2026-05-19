#!/bin/bash
# Minimal model launcher — gemma-4b, gemma-26b, qwen-moe variants

LLAMA_SERVER_BIN="${HOME}/AI/llama.cpp/build/bin/llama-server"
ATOMIC_SERVER_BIN="${HOME}/AI/atomic-llama.cpp/build/bin/llama-server"
MODELS_DIR="${HOME}/AI/models"
LOGS_DIR="${HOME}/AI/logs"
SERVER_HOST="0.0.0.0"
SERVER_PORT="8081"

mkdir -p "$LOGS_DIR"
PIDFILE="$LOGS_DIR/llama-server.pid"

QWEN_MODEL="$MODELS_DIR/Qwen3.6-35B-A3B-MTP-Q4_K_M.gguf"
QWEN_CHAT_TEMPLATE="$MODELS_DIR/qwen-chat-template.jinja"
GEMMA_CHAT_TEMPLATE="$MODELS_DIR/gemma4-chat-template.jinja"
QWEN_MMP="$MODELS_DIR/mmproj-qwen3.6-f16.gguf"
GEMMA_26B="$MODELS_DIR/gemma-4-26B-A4B-it-UD-Q4_K_XL.gguf"
GEMMA_26B_MMP="$MODELS_DIR/mmproj-BF16.gguf"
GEMMA_4B="$MODELS_DIR/gemma-4-E4B-it-Q4_K_M.gguf"
GEMMA_MTP_HEAD="$MODELS_DIR/gemma-4-26B-A4B-it-assistant.Q8_0.gguf"

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
  local bin="${LLAMA_SERVER_BIN}"
  # if the first extra arg is a --bin path, use it
  if [[ "${extra_args[0]}" == --bin ]]; then
    bin="${extra_args[1]}"
    extra_args=("${extra_args[@]:2}")
  fi
  if [ ! -f "$model" ]; then echo "Model not found: $model"; return 1; fi
  local log="$LOGS_DIR/${tag}_$(date +%Y%m%d_%H%M%S).log"
  echo "CMD: $bin -m $model --host $SERVER_HOST --port $SERVER_PORT --no-webui ${extra_args[*]}" >> "$log"
  nohup "$bin" -m "$model" --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui "${extra_args[@]}" > "$log" 2>&1 &
  echo $! > "$PIDFILE"
  echo "Starting $tag -> $log (pid $(cat "$PIDFILE" 2>/dev/null))"
  if _wait_health 120; then echo "Server healthy"; else echo "Server health did not appear; check $log"; fi
}

gemma-4b() {
  _start "$GEMMA_4B" gemma-4b --ctx-size 131072 --batch-size 1024 --ubatch-size 512 --threads 10 --threads-batch 10 --parallel 1 --flash-attn on
}

gemma-26b() {
  if [ ! -f "$GEMMA_26B_MMP" ]; then echo "Missing mmproj: $GEMMA_26B_MMP"; return 1; fi
  # 32k ctx, --fit on, bs=1024 -> ~25 tok/s on RTX 4060
  _start "$GEMMA_26B" gemma-26b --mmproj "$GEMMA_26B_MMP" --media-path "$HOME" --no-mmproj-offload --fit on --ctx-size 32768 --batch-size 1024 --ubatch-size 512 --threads 10 --threads-batch 10 --parallel 1 --flash-attn on
}

gemma-mtp() {
  local bin="${ATOMIC_SERVER_BIN}"
  if [ ! -f "$bin" ]; then echo "AtomicChat fork not built at $bin"; return 1; fi
  if [ ! -f "$GEMMA_MTP_HEAD" ]; then echo "Missing MTP head: $GEMMA_MTP_HEAD"; return 1; fi
  # Uses AtomicChat fork for gemma4_assistant arch support.
  # draft-max=3, draft-p-min=0 -> ~28 tok/s (40% over 20 baseline) on RTX 4060
  _start "$GEMMA_26B" gemma-mtp --bin "$bin" --spec-type mtp --mtp-head "$GEMMA_MTP_HEAD" --jinja --ctx-size 32768 --batch-size 1024 --ubatch-size 1024 --draft-max 3 --draft-p-min 0.0
}

qwen-moe() {
  if [ ! -f "$QWEN_MMP" ]; then echo "Missing mmproj: $QWEN_MMP"; return 1; fi
  # Q4_K_M, 80k ctx, --fit on -> ~26 tok/s on RTX 4060 (P3/21W)
  _start "$QWEN_MODEL" qwen-moe --mmproj "$QWEN_MMP" --no-mmproj-offload --fit on --no-mmap --cache-ram 0 --ctx-size 81920 --batch-size 256 --ubatch-size 128 --threads 10 --threads-batch 10 --parallel 1 --flash-attn on -ctk q8_0 -ctv q8_0 --chat-template-file "$QWEN_CHAT_TEMPLATE"
}

qwen-mtp() {
  if [ ! -f "$QWEN_MMP" ]; then echo "Missing mmproj: $QWEN_MMP"; return 1; fi
  # Q4_K_M + MTP, nmax=2 -> ~37 tok/s (81% acceptance) on RTX 4060 (P3/21W)
  _start "$QWEN_MODEL" qwen-mtp --mmproj "$QWEN_MMP" --no-mmproj-offload --fit on --no-mmap --cache-ram 0 --ctx-size 81920 --batch-size 256 --ubatch-size 128 --threads 10 --threads-batch 10 --parallel 1 --flash-attn on -ctk q8_0 -ctv q8_0 --chat-template-file "$QWEN_CHAT_TEMPLATE" --spec-type draft-mtp --spec-draft-n-max 2 --spec-draft-p-min 0.0
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
  qwen-moe     Start Qwen3.6 35B Q4_K_M ~26 tok/s (80k ctx)
  qwen-mtp     Start Qwen3.6 35B + MTP ~37 tok/s (80k ctx)
  gemma-26b   Start Gemma 26B multimodal
  gemma-mtp   Start Gemma 26B + MTP draft head (~28 tok/s)
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
    qwen-mtp) qwen-mtp "$@" ;;
    gemma-26b) gemma-26b "$@" ;;
    gemma-mtp) gemma-mtp "$@" ;;
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
  qwen-mtp) qwen-mtp ;;
  gemma-26b) gemma-26b ;;
  gemma-mtp) gemma-mtp ;;
  gemma-4b) gemma-4b ;;
  stop) stop ;;
  status) status ;;
  logs) logs ;;
  help|""|*) help ;;
  esac
fi