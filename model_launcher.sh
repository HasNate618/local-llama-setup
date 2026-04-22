#!/bin/bash
# Model launcher for llama.cpp - source this from ~/.bashrc

# Configuration
LLAMA_SERVER_BIN="${HOME}/AI/llama.cpp/build/bin/llama-server"
MODELS_DIR="${HOME}/AI/models"
LOGS_DIR="${HOME}/AI/logs"
SERVER_HOST="0.0.0.0"
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
        gemma)
            _llama_start_gemma
            ;;
        qwen-moe)
            _llama_start_qwen_moe
            ;;
        qwen-moe-q4km)
            _llama_start_qwen_moe_q4km
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

# Start Gemma 4 E4B with multimodal projection (128K context, text+image+audio)
_llama_start_gemma() {
    local model_path="$MODELS_DIR/gemma-4-E4B-it-Q4_K_M.gguf"
    local mmproj_path="$MODELS_DIR/mmproj-F16.gguf"

    if [ ! -f "$model_path" ]; then
        echo "Error: Model not found at $model_path"
        return 1
    fi

    if [ ! -f "$mmproj_path" ]; then
        echo "Error: Multimodal projection not found at $mmproj_path"
        return 1
    fi

    _llama_stop

    local log_file="${LOGS_DIR}/gemma4_multimodal_$(date +%Y%m%d_%H%M%S).log"

    echo "Starting llama-server: Gemma 4 E4B (multimodal, 128K context)..."
    echo "Logs: $log_file"
    echo "Endpoint: http://${SERVER_HOST}:${SERVER_PORT}"

    nohup "$LLAMA_SERVER_BIN" \
        -m "$model_path" \
        --mmproj "$mmproj_path" \
        --media-path "$HOME" \
        --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui \
        -ngl 999 --ctx-size 131072 --batch-size 1024 --ubatch-size 512 \
        --threads 10 --threads-batch 10 --parallel 1 --flash-attn on \
        -ctk q8_0 -ctv q8_0 \
        --reasoning on --reasoning-budget 256 \
        --temp 0.3 --top-p 0.90 --top-k 40 --min-p 0.03 \
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

# Start Qwen3.6-35B-A3B MoE model (qwen35moe 35B.A3B) tuned for 8GB VRAM at 128K ctx
_llama_start_qwen_moe() {
    local model_path="$MODELS_DIR/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-Q4_K_P.gguf"
    local chat_template_path="$MODELS_DIR/chat_template.jinja"
    local chat_template_kwargs='{"preserve_thinking": true}'

    if [ ! -f "$model_path" ]; then
        echo "Error: Model not found at $model_path"
        return 1
    fi

    if [ ! -f "$chat_template_path" ]; then
        echo "Error: Chat template not found at $chat_template_path"
        return 1
    fi

    _llama_stop

    local log_file="${LOGS_DIR}/qwen36_moe_$(date +%Y%m%d_%H%M%S).log"

    echo "Starting llama-server: Qwen3.6-35B-A3B MoE (128K context, thinking enabled, 8GB VRAM tuned)..."
    echo "Logs: $log_file"
    echo "Endpoint: http://${SERVER_HOST}:${SERVER_PORT}"
    echo "Settings: ngl=10, ncmoe=0, ctx=128K, flash-attn=on, preserve_thinking=true, reasoning=on"

    # 8GB profile: keep 128K context while fitting VRAM
    # - ngl=10 is the highest stable layer offload at 128K on this laptop GPU
    # - ncmoe=0 is currently the most stable option on llama.cpp b8831
    # - preserve_thinking=true keeps prior thinking blocks in chat history
    # - reasoning on + budget enables hybrid thinking mode for better quality
    nohup "$LLAMA_SERVER_BIN" \
        -m "$model_path" \
        --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui \
        -ngl 10 -ncmoe 0 --ctx-size 131072 --batch-size 256 --ubatch-size 128 \
        --threads 4 --threads-batch 4 --parallel 1 --flash-attn on \
        --chat-template-file "$chat_template_path" \
        --chat-template-kwargs "$chat_template_kwargs" \
        -ctk q8_0 -ctv q8_0 \
        --reasoning on --reasoning-budget 1024 \
        --temp 0.6 --top-p 0.95 --top-k 20 --min-p 0.0 \
        --presence-penalty 0.0 --repeat-penalty 1.0 \
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

# Start Qwen3.6-35B-A3B MoE model (Q4_K_M, aggressive 8GB fit profile)
_llama_start_qwen_moe_q4km() {
    local model_path="$MODELS_DIR/Qwen_Qwen3.6-35B-A3B-Q4_K_M.gguf"
    local chat_template_path="$MODELS_DIR/chat_template.jinja"
    local chat_template_kwargs='{"preserve_thinking": true}'

    if [ ! -f "$model_path" ]; then
        echo "Error: Model not found at $model_path"
        return 1
    fi

    if [ ! -f "$chat_template_path" ]; then
        echo "Error: Chat template not found at $chat_template_path"
        return 1
    fi

    _llama_stop

    local log_file="${LOGS_DIR}/qwen36_moe_q4km_$(date +%Y%m%d_%H%M%S).log"

    echo "Starting llama-server: Qwen3.6-35B-A3B MoE Q4_K_M (128K context, fit-based, 8GB VRAM tuned)..."
    echo "Logs: $log_file"
    echo "Endpoint: http://${SERVER_HOST}:${SERVER_PORT}"
    echo "Settings: ngl=auto, ncmoe=38, fit-target=60, ctx=128K, no-mmap, cache-ram=0, reasoning=on"

    # Aggressive 8GB profile based on the Reddit thread.
    # Let fit choose the GPU split, keep the first MoE layers on CPU, and avoid prompt-cache/pageout pressure.
    nohup "$LLAMA_SERVER_BIN" \
        -m "$model_path" \
        --host "$SERVER_HOST" --port "$SERVER_PORT" --no-webui \
        -ngl auto -ncmoe 38 --fit on --fit-target 60 --ctx-size 131072 --batch-size 256 --ubatch-size 128 \
        --threads 6 --threads-batch 6 --parallel 1 --flash-attn on \
        --no-mmap --cache-ram 0 \
        --chat-template-file "$chat_template_path" \
        --chat-template-kwargs "$chat_template_kwargs" \
        -ctk q8_0 -ctv q8_0 \
        --reasoning on --reasoning-budget 1024 \
        --temp 0.6 --top-p 0.95 --top-k 20 --min-p 0.0 \
        --presence-penalty 0.0 --repeat-penalty 1.0 \
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
  gemma               Start Gemma 4 E4B (multimodal, 128k ctx, text+image+audio)
  qwen-moe            Start Qwen3.6-35B-A3B MoE (128k ctx, stable Q4_K_P)
  qwen-moe-q4km       Start Qwen3.6-35B-A3B MoE Q4_K_M (fit-based, low VRAM)
  stop                Stop all servers
  status              Check server status
  logs [model]        Show/tail recent logs
  help                Show this help message

Examples:
  llama reasoning           # Start Qwen3.5-9B reasoning model
  llama qwopus              # Start Qwopus reasoning-enhanced model
  llama sushi               # Start Sushi multimodal (images + code)
  llama sushi-coder         # Start Sushi text-only (fastest coder)
  llama gemma               # Start Gemma 4 multimodal (128k ctx, RAG optimized)
  llama qwen-moe            # Start Qwen3.6-35B-A3B MoE (stable Q4_K_P)
  llama qwen-moe-q4km       # Start Q4_K_M fit-based profile from Reddit
  llama stop                # Stop all servers
  llama status              # Check if running
  llama logs sushi-coder    # Tail sushi-coder logs
EOF
}

# Export main function
export -f llama
