#!/bin/bash
# Model launcher for llama.cpp - source this from ~/.bashrc

# Configuration
LLAMA_SERVER_BIN="${HOME}/AI/llama.cpp/build/bin/llama-server"
MODELS_DIR="${HOME}/AI/models"
LOGS_DIR="${HOME}/AI/logs"
SERVER_HOST="127.0.0.1"
SERVER_PORT="8081"

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_DIR"

# Main llama command dispatcher
llama() {
    local cmd="$1"
    local arg="$2"
    
    case "$cmd" in
        reasoning)
            _llama_start_reasoning
            ;;
        qwopus)
            _llama_start_qwopus
            ;;
        sushi)
            _llama_start_sushi
            ;;
        sushi-coder)
            _llama_start_sushi_coder
            ;;
        stop)
            _llama_stop
            ;;
        status)
            _llama_status
            ;;
        logs)
            _llama_logs "$arg"
            ;;
        help|"")
            _llama_help
            ;;
        *)
            echo "Unknown command: $cmd"
            _llama_help
            return 1
            ;;
    esac
}

# Start Qwen3.5-9B reasoning model (optimized 64K context for coding agents)
_llama_start_reasoning() {
    local model_path="$MODELS_DIR/Qwen3.5-9B.Q4_K_M.gguf"

    if [ ! -f "$model_path" ]; then
        echo "Error: Model not found at $model_path"
        return 1
    fi

    _llama_stop

    local log_file="${LOGS_DIR}/qwen35_reasoning_$(date +%Y%m%d_%H%M%S).log"

    echo "Starting llama-server: Qwen3.5-9B reasoning (64K context, coding agent)..."
    echo "Logs: $log_file"
    echo "Endpoint: http://${SERVER_HOST}:${SERVER_PORT}"

    nohup "$LLAMA_SERVER_BIN" \
        -m "$model_path" \
        --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui \
        -ngl 999 --ctx-size 65536 --batch-size 1024 --ubatch-size 512 \
        --threads 10 --threads-batch 10 --parallel 1 --flash-attn on \
        -ctk q8_0 -ctv q8_0 \
        --reasoning on --reasoning-budget 1024 \
        --temp 0.35 --top-p 0.90 --top-k 40 --min-p 0.03 \
        --repeat-penalty 1.05 --repeat-last-n 128 \
        --prio 1 --poll 50 --perf \
        > "$log_file" 2>&1 &

    sleep 3

    if pgrep -f "llama-server" > /dev/null; then
        echo "✓ Server started successfully (PID: $(pgrep -f 'llama-server'))"
    else
        echo "✗ Server failed to start. Check logs: $log_file"
        return 1
    fi
}

# Start Qwopus3.5-9B-v3 reasoning-enhanced model (optimized 64K context for coding agents)
_llama_start_qwopus() {
    local model_path="$MODELS_DIR/Qwen3.5-9B.Q5_K_S.gguf"

    if [ ! -f "$model_path" ]; then
        echo "Error: Model not found at $model_path"
        return 1
    fi

    _llama_stop

    local log_file="${LOGS_DIR}/qwopus_$(date +%Y%m%d_%H%M%S).log"

    echo "Starting llama-server: Qwopus3.5-9B-v3 (64K context, coding agent)..."
    echo "Logs: $log_file"
    echo "Endpoint: http://${SERVER_HOST}:${SERVER_PORT}"

    nohup "$LLAMA_SERVER_BIN" \
        -m "$model_path" \
        --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui \
        -ngl 999 --ctx-size 65536 --batch-size 1024 --ubatch-size 512 \
        --threads 10 --threads-batch 10 --parallel 1 --flash-attn on \
        -ctk q8_0 -ctv q8_0 \
        --reasoning on --reasoning-budget 1024 \
        --temp 0.35 --top-p 0.90 --top-k 40 --min-p 0.03 \
        --repeat-penalty 1.05 --repeat-last-n 128 \
        --prio 1 --poll 50 --perf \
        > "$log_file" 2>&1 &

    sleep 3

    if pgrep -f "llama-server" > /dev/null; then
        echo "✓ Server started successfully (PID: $(pgrep -f 'llama-server'))"
    else
        echo "✗ Server failed to start. Check logs: $log_file"
        return 1
    fi
}

# Start Qwen3.5-9B Sushi Coder RL model with multimodal projection
_llama_start_sushi() {
    local model_path="$MODELS_DIR/Qwen3.5-9b-Sushi-Coder-RL.Q4_K_M.gguf"
    local mmproj_path="$MODELS_DIR/Qwen3.5-9b-Sushi-Coder-RL.BF16-mmproj.gguf"

    if [ ! -f "$model_path" ]; then
        echo "Error: Model not found at $model_path"
        return 1
    fi

    if [ ! -f "$mmproj_path" ]; then
        echo "Error: Multimodal projection not found at $mmproj_path"
        return 1
    fi

    _llama_stop

    local log_file="${LOGS_DIR}/qwen35_sushi_multimodal_$(date +%Y%m%d_%H%M%S).log"

    echo "Starting llama-server: Qwen3.5-9B Sushi Coder RL (multimodal, 32K context)..."
    echo "Logs: $log_file"
    echo "Endpoint: http://${SERVER_HOST}:${SERVER_PORT}"

    nohup "$LLAMA_SERVER_BIN" \
        -m "$model_path" \
        --mmproj "$mmproj_path" \
        --media-path "$HOME" \
        --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui \
        -ngl 999 --ctx-size 32768 --batch-size 512 --ubatch-size 256 \
        --threads 10 --threads-batch 10 --parallel 1 --flash-attn on \
        -ctk q8_0 -ctv q8_0 \
        --reasoning off --reasoning-budget 0 \
        --temp 0.20 --top-p 0.90 --top-k 40 --min-p 0.02 \
        --repeat-penalty 1.03 --repeat-last-n 128 \
        > "$log_file" 2>&1 &

    sleep 3

    if pgrep -f "llama-server" > /dev/null; then
        echo "✓ Server started successfully (PID: $(pgrep -f 'llama-server'))"
    else
        echo "✗ Server failed to start. Check logs: $log_file"
        return 1
    fi
}

# Start Qwen3.5-9B Sushi Coder RL model (text-only, 64K context, RL-tuned)
_llama_start_sushi_coder() {
    local model_path="$MODELS_DIR/Qwen3.5-9b-Sushi-Coder-RL.Q4_K_M.gguf"

    if [ ! -f "$model_path" ]; then
        echo "Error: Model not found at $model_path"
        return 1
    fi

    _llama_stop

    local log_file="${LOGS_DIR}/sushi_coder_$(date +%Y%m%d_%H%M%S).log"

    echo "Starting llama-server: Sushi Coder RL (text-only, 64K context)..."
    echo "Logs: $log_file"
    echo "Endpoint: http://${SERVER_HOST}:${SERVER_PORT}"

    nohup "$LLAMA_SERVER_BIN" \
        -m "$model_path" \
        --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui \
        -ngl 999 --ctx-size 65536 --batch-size 1024 --ubatch-size 512 \
        --threads 10 --threads-batch 10 --parallel 1 --flash-attn on \
        -ctk q8_0 -ctv q8_0 \
        --reasoning off \
        --temp 0.6 --top-p 0.95 --top-k 20 --min-p 0.0 \
        --repeat-penalty 1.0 --repeat-last-n 128 \
        --prio 1 --poll 50 --perf \
        > "$log_file" 2>&1 &

    sleep 3

    if pgrep -f "llama-server" > /dev/null; then
        echo "✓ Server started successfully (PID: $(pgrep -f 'llama-server'))"
    else
        echo "✗ Server failed to start. Check logs: $log_file"
        return 1
    fi
}

# Stop all running servers
_llama_stop() {
    if pgrep -f "llama-server" > /dev/null; then
        echo "Stopping llama-server instances..."
        pkill -f "llama-server"
        sleep 1
        if pgrep -f "llama-server" > /dev/null; then
            pkill -9 -f "llama-server"
        fi
        echo "✓ Stopped"
    fi
}

# Check server status
_llama_status() {
    if pgrep -f "llama-server" > /dev/null; then
        echo "✓ Server is running"
        ps aux | grep "llama-server" | grep -v grep
    else
        echo "✗ No server running"
    fi
}

# Show logs
_llama_logs() {
    local model="${1:-}"
    if [ -z "$model" ]; then
        echo "Recent logs:"
        ls -lt "$LOGS_DIR" 2>/dev/null | head -10 | tail -n +2 | awk '{print $9}'
    else
        local latest=$(ls -t "$LOGS_DIR"/${model}* 2>/dev/null | head -1)
        if [ -n "$latest" ]; then
            tail -f "$latest"
        else
            echo "No logs found for: $model"
        fi
    fi
}

# Help
_llama_help() {
    cat << 'EOF'
llama - Model launcher for llama.cpp

Usage: llama <command> [args]

Commands:
  reasoning           Start Qwen3.5-9B reasoning (64k ctx)
  qwopus              Start Qwopus3.5-9B-v3 reasoning-enhanced (64k ctx)
  sushi               Start Sushi Coder RL (multimodal, 32k ctx)
  sushi-coder         Start Sushi Coder RL (text-only, 64k ctx, fastest)
  stop                Stop all servers
  status              Check server status
  logs [model]        Show/tail recent logs
  help                Show this help message

Examples:
  llama reasoning           # Start Qwen3.5-9B reasoning model
  llama qwopus              # Start Qwopus reasoning-enhanced model
  llama sushi               # Start Sushi multimodal (images + code)
  llama sushi-coder         # Start Sushi text-only (fastest coder)
  llama stop                # Stop all servers
  llama status              # Check if running
  llama logs sushi-coder    # Tail sushi-coder logs
EOF
}

# Export main function
export -f llama
