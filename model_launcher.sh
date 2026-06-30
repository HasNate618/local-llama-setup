#!/usr/bin/env bash
# llama-server wrapper — multi-model support
set -euo pipefail

# CUDA driver runtime (NixOS)
export LD_LIBRARY_PATH="/run/opengl-driver/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

MODELS_DIR="/home/nate/AI/models"
LOGS_DIR="/home/nate/AI/logs"
HOST="0.0.0.0"
PORT="11434"
PIDFILE="${LOGS_DIR}/llama-server.pid"

# ik_llama.cpp binary (MTP support)
IK_LLAMA="/home/nate/AI/ik_llama.cpp/build/bin/llama-server"

mkdir -p "$LOGS_DIR"

# Model definitions: name|file|ctx|extra_flags
declare -A MODELS=(
  ["ornith"]="ornith-1.0-35b-Q4_K_M-MTP.gguf|131072|--spec-type \"mtp:n_max=3,p_min=0.0\" --fit --no-mmap -cram 0 -b 512 -ub 256 --flash-attn on -ctk q8_0 -ctv q8_0 --jinja"
  ["qwen"]="Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-Q4_K_M.gguf|131072|--spec-type \"mtp:n_max=3,p_min=0.0\" --fit --no-mmap -cram 0 -b 512 -ub 256 --flash-attn on -ctk q8_0 -ctv q8_0 --jinja"
)

ACTION="${1:-help}"

# Commands that don't need a model
case "$ACTION" in
  stop)
    if [ -f "$PIDFILE" ]; then
      old_pid=$(cat "$PIDFILE" || true)
      if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
        echo "Stopping server pid $old_pid"
        kill "$old_pid" || true
        for _ in $(seq 1 30); do
          kill -0 "$old_pid" 2>/dev/null || break
          sleep 1
        done
        echo "Stopped"
      else
        echo "No running server with pid $old_pid"
      fi
      rm -f "$PIDFILE"
    else
      echo "No PID file, trying pkill fallback..."
      pkill -f "llama-server.*${PORT}" || echo "No server on port $PORT"
    fi
    exit 0
    ;;
  status)
    pgrep -af llama-server || echo "no server"
    exit 0
    ;;
  logs)
    ls -lt "$LOGS_DIR" | head -20
    exit 0
    ;;
  help)
    cat <<EOF
Usage: llama <model> [start]

Models:
  ornith   Ornith 35B MTP — coding, ~35-46 t/s
  qwen     Qwen 3.6 35B Uncensored — general, ~35 t/s

Commands:
  start   Start the server (default)
  stop    Stop the running server
  status  Show running server process
  logs    List recent log files

Examples:
  llama ornith          Start Ornith (coding)
  llama qwen            Start Qwen (uncensored)
  llama stop            Stop any running server
  llama status          Check if server is running
EOF
    exit 0
    ;;
esac

# Remaining commands need a model
MODEL_KEY="$ACTION"
shift 2>/dev/null || true
ACTION="${1:-start}"

if [[ -z "${MODELS[$MODEL_KEY]+x}" ]]; then
  echo "Unknown model: $MODEL_KEY"
  echo "Run 'llama help' to see available models."
  exit 1
fi

IFS='|' read -r MODEL_FILE MODEL_CTX MODEL_EXTRA <<< "${MODELS[$MODEL_KEY]}"
MODEL_PATH="${MODELS_DIR}/${MODEL_FILE}"
LLAMA_BIN="$IK_LLAMA"

_wait_health() {
  local t=${1:-120}
  for i in $(seq 1 "$t"); do
    if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
      echo "Server healthy"
      return 0
    fi
    sleep 1
  done
  echo "Health check timed out after ${t}s"
  return 1
}

start() {
  if [ -f "$PIDFILE" ]; then
    old_pid=$(cat "$PIDFILE" 2>/dev/null || true)
    if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
      echo "Server already running (pid $old_pid). Stop first."
      return 1
    fi
    rm -f "$PIDFILE"
  fi

  if [ ! -f "$MODEL_PATH" ]; then
    echo "Model not found: $MODEL_PATH"
    return 1
  fi

  if [ ! -x "$LLAMA_BIN" ]; then
    echo "Binary not found: $LLAMA_BIN"
    return 1
  fi

  local log="${LOGS_DIR}/${MODEL_KEY}_$(date +%Y%m%d_%H%M%S).log"

  echo "Starting $MODEL_KEY: ctx=$MODEL_CTX"

  eval set -- $MODEL_EXTRA
  local extra_args=("$@")

  nohup "$LLAMA_BIN" \
    -m "$MODEL_PATH" \
    --host "$HOST" \
    --port "$PORT" \
    --ctx-size "$MODEL_CTX" \
    --log-file "${LOGS_DIR}/${MODEL_KEY}_server" \
    "${extra_args[@]}" \
    > "$log" 2>&1 &

  echo $! > "$PIDFILE"
  echo "Starting server -> $log (pid $(cat "$PIDFILE"))"

  _wait_health 120
}

case "$ACTION" in
  start)  start ;;
  *)      echo "Unknown action: $ACTION" ;;
esac
