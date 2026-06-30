#!/bin/bash
# llama.cpp model launcher — multi-model support with MTP
# Updated for ik_llama.cpp (MTP CUDA fixes) + NixOS

# ik_llama.cpp binary (MTP support, CUDA fixes for RTX 4060)
IK_LLAMA_BIN="${HOME}/AI/ik_llama.cpp/build/bin/llama-server"
# Main llama.cpp binary (NixOS system, no MTP)
MAIN_LLAMA_BIN="/run/current-system/sw/bin/llama-server"

MODELS_DIR="${HOME}/AI/models"
LOGS_DIR="${HOME}/AI/logs"
SERVER_HOST="0.0.0.0"
SERVER_PORT="11434"

mkdir -p "$LOGS_DIR"
PIDFILE="$LOGS_DIR/llama-server.pid"

# Model files
ORNITH_MODEL="$MODELS_DIR/ornith-1.0-35b-Q4_K_M-MTP.gguf"
ORNITH_MMP="$MODELS_DIR/ornith-mmproj-F16.gguf"
QWEN_MODEL="$MODELS_DIR/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-Q4_K_M.gguf"

_wait_health() {
  local t=${1:-120}; local i=0
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
  local bin="${IK_LLAMA_BIN}"
  # if the first extra arg is a --bin path, use it
  if [[ "${extra_args[0]}" == --bin ]]; then
    bin="${extra_args[1]}"
    extra_args=("${extra_args[@]:2}")
  fi
  if [ ! -f "$model" ]; then echo "Model not found: $model"; return 1; fi
  local log="$LOGS_DIR/${tag}_$(date +%Y%m%d_%H%M%S).log"
  echo "CMD: $bin -m $model --host $SERVER_HOST --port $SERVER_PORT ${extra_args[*]}" >> "$log"
  nohup "$bin" -m "$model" --host "$SERVER_HOST" --port "$SERVER_PORT" "${extra_args[@]}" > "$log" 2>&1 &
  echo $! > "$PIDFILE"
  echo "Starting $tag -> $log (pid $(cat "$PIDFILE" 2>/dev/null))"
  if _wait_health 120; then echo "Server healthy"; else echo "Server health did not appear; check $log"; fi
}

# === MODEL PROFILES ===

ornith() {
  # Ornith 35B MTP — coding model, ~35-46 t/s on RTX 4060
  # ik_llama.cpp with MTP, 128K ctx, --fit auto-offload
  _start "$ORNITH_MODEL" ornith \
    --spec-type "mtp:n_max=3,p_min=0.0" \
    --fit --no-mmap -cram 0 \
    -b 512 -ub 256 \
    --flash-attn on -ctk q8_0 -ctv q8_0 \
    --ctx-size 131072 \
    --parallel 1 \
    --jinja
}

ornith-vision() {
  # Ornith 35B MTP + vision
  if [ ! -f "$ORNITH_MMP" ]; then echo "Missing mmproj: $ORNITH_MMP"; return 1; fi
  _start "$ORNITH_MODEL" ornith-vision \
    --mmproj "$ORNITH_MMP" \
    --spec-type "mtp:n_max=3,p_min=0.0" \
    --fit --no-mmap -cram 0 \
    -b 512 -ub 256 \
    --flash-attn on -ctk q8_0 -ctv q8_0 \
    --ctx-size 131072 \
    --parallel 1 \
    --jinja
}

qwen() {
  # Qwen 3.6 35B Uncensored — general chat, ~35 t/s with MTP
  # Uses ik_llama.cpp for MTP support (crashes on main llama.cpp)
  _start "$QWEN_MODEL" qwen \
    --spec-type "mtp:n_max=3,p_min=0.0" \
    --fit --no-mmap -cram 0 \
    -b 512 -ub 256 \
    --flash-attn on -ctk q8_0 -ctv q8_0 \
    --ctx-size 131072 \
    --parallel 1 \
    --jinja
}

# === SERVER COMMANDS ===

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
    pkill -f "llama-server.*${SERVER_PORT}" || echo "No server on port $SERVER_PORT"
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
Usage: llama <model> [start]

Models:
  ornith        Ornith 35B MTP — coding, ~35-46 t/s
  ornith-vision Ornith 35B MTP + vision
  qwen          Qwen 3.6 35B Uncensored — general, ~35 t/s

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

Performance (RTX 4060 8GB, ik_llama.cpp):
  ornith MTP:  35-46 t/s, 73-94% acceptance
  qwen MTP:    35 t/s, 71-75% acceptance
  (vs no MTP:  13 t/s baseline)
EOF
}

# === DISPATCHER ===

ACTION="${1:-help}"

case "$ACTION" in
  ornith)       ornith ;;
  ornith-vision) ornith-vision ;;
  qwen)         qwen ;;
  stop)         stop ;;
  status)       status ;;
  logs)         logs ;;
  help|*)       help ;;
esac
