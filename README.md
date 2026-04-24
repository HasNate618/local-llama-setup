# Model Launcher — llama.cpp server helper

Lightweight launcher and defaults for running local llama.cpp model servers with a tuned profile for Qwen3.6 multimodal on small GPUs.

Purpose
- Provide a single, minimal entrypoint (model_launcher.sh) to start/stop local llama.cpp servers with safe PID-file semantics and tuned defaults.
- Keep the repository minimal (only model_launcher.sh tracked) while models, logs and benchmark scripts remain on disk but untracked.

Prerequisites
- Linux with an NVIDIA GPU (tested on RTX 4060 ~8GB VRAM).
- llama.cpp built with CUDA support at: ${HOME}/AI/llama.cpp/build/bin/llama-server (edit model_launcher.sh to change).
- Models and mmproj files placed under ${HOME}/AI/models (the launcher references names in model_launcher.sh).
- Tools: bash, curl, python3 for bench helpers.

Quick Start
- Execute the launcher directly (recommended for one-shot runs):

  ./model_launcher.sh qwen-moe

- Source the launcher in an interactive shell to expose functions without auto-running the dispatcher:

  source ~/AI/model_launcher.sh
  qwen-moe

Notes:
- When executed directly the script will run the dispatcher; when sourced it only defines functions (no help printed on new terminals).
- The server writes a pidfile to: /home/nate/AI/logs/llama-server.pid and logs to /home/nate/AI/logs/<tag>_YYYYmmdd_HHMMSS.log

Commands (launcher)
- qwen-moe — Start Qwen3.6 35B tuned profile (multimodal).
- gemma-26b — Start Gemma 26B multimodal.
- gemma-4b — Start Gemma 4B.
- sushi — Start Sushi 9B multimodal.
- stop — Stop server (uses pidfile semantics).
- status — Show running server process.
- logs — Show recent logs.
- help — Print help text.

Tuned qwen-moe profile (defaults in model_launcher.sh)
- Rationale: these defaults came from focused benchmarking on an RTX 4060 (8GB) and aim to maximize throughput while keeping startup stable.
- Key flags included by default:
  - --mmproj <path> (multimodal projector, path set in model_launcher.sh)
  - --no-mmproj-offload (prefer projector on GPU for speed; increases VRAM pressure)
  - --kv-unified (faster prompt throughput when stable)
  - --n-gpu-layers 10 (fast placement in prior runs — may be reduced if OOM)
  - --n-cpu-moe 0 (observed stable)
  - --ctx-size 131072 (128k multimodal target)
  - --batch-size 512 --ubatch-size 256 (fastest observed; fallback recommended)
  - --no-mmap --cache-ram 0, -ctk q8_0 -ctv q8_0, --flash-attn on, --threads 10 --threads-batch 10

Fallbacks and safe alternatives
- If the server crashes during startup with CUDA OOM, try these in order:
  1) Reduce --n-gpu-layers to 9 (minimal perf hit, often resolves OOM during warmup).
  2) Reduce batch/ubatch to 256/128.
  3) Remove --no-mmproj-offload (allow projector to occupy CPU memory).
  4) Reduce --ctx-size to 65536 (falls back from full 128k capacity).
  5) Remove explicit --n-gpu-layers and let the binary --fit auto-place (repeatable results may vary).

Smoke test & verification
1. Start the server: ./model_launcher.sh qwen-moe
2. Check health:

   curl -fsS http://127.0.0.1:8081/health && echo "healthy"

3. If health fails, inspect the most recent log: tail -n 300 /home/nate/AI/logs/<recent-qwen-moe-log>

4. When sending requests from the bench harness, ensure JSON bodies are single-line (the server returns 500 errors for raw newlines in POST bodies). Use python json.dump to create payloads.

Benchmarking & logs
- Bench harness and sweep scripts exist on disk (bench_runner.sh and multiple run_* scripts) and are intentionally untracked; they use PID-file semantics and single-line JSON bodies.
- All outputs and traces should be saved under /home/nate/AI/logs with descriptive names. Example folder from previous runs: /home/nate/AI/logs/high_conf_sweep_20260424_021144/

Troubleshooting (common failures)
- "cannot meet free memory target" or "need to reduce device memory" — indicates the requested GPU placement exceeds free VRAM; reduce ngl or batch sizes.
- "CUDA error: out of memory ... ggml_cuda_graph_evaluate_and_capture" — graph capture/warmup OOM. Try ngl=9 or smaller batches.
- 500 responses to chat completion POSTs — make sure request JSON has no raw newlines or is properly escaped.
- Port binding race or stale process — check pidfile: cat /home/nate/AI/logs/llama-server.pid and ps -p <pid>, then stop with ./model_launcher.sh stop.

Safety notes
- The launcher uses PID-file start/stop semantics (no pkill) to avoid killing unrelated processes and to reduce port-binding races.
- The script is safe to source in your shell startup; it will not auto-run commands when sourced.

Development notes
- Repo policy: keep only model_launcher.sh tracked in git. Large files (models, logs, llama.cpp) remain on disk but untracked.
- To change defaults: edit model_launcher.sh, test using the smoke test, and commit changes with a clear message describing why.
- Recommended .gitignore entries (optional):

  models/
  llama.cpp/
  logs/

FAQ (quick answers)
- Q: Why did the server OOM on startup even when VRAM looked available?
  A: Graph capture and projector warmup temporarily use additional GPU buffers; the auto-fit step and ngl setting determine where tensors live. If ngl is forced high, fit can't reduce GPU-resident layers and warmup can OOM.

- Q: I keep seeing 500 errors when running bench scripts — what's up?
  A: The bench harness must send single-line JSON bodies (python json.dump), because raw newlines in the POST body have caused the server to return HTTP 500 in previous runs.

Appendix: example curl (single-line JSON body created by python)

  python3 -c "import json; print(json.dumps({'model':'local','messages':[{'role':'user','content':'hello'}],'max_tokens':64}))" > /tmp/body.json
  curl -sS -X POST 'http://127.0.0.1:8081/v1/chat/completions' -H 'Content-Type: application/json' --data-binary @/tmp/body.json

If you want, I can also add a .gitignore file and commit it. I can also tune qwen-moe defaults (ngl -> 9) and commit that change — tell me which you'd like next.

Benchmarks
---------
Summary of recent focused runs (stored under /home/nate/AI/logs):

- Best observed generation throughput: 15.36 tok/s (file: /home/nate/AI/logs/high_conf_sweep_20260424_021144/qwen36_ngl10_kv_nc0-medium-nc0.json).
- Typical stable cluster: 12–14 tok/s across other tuned runs (many files named qwen36_ngl{9,10,11,12}_* in the same directory).

Top-performing config (used for the best run):
- --n-gpu-layers 10
- --n-cpu-moe 0
- --kv-unified
- --no-mmproj-offload (mmproj on GPU)
- --ctx-size 131072
- --batch-size 512 --ubatch-size 256

Notes and reproducibility
- These numbers were collected on an RTX 4060 laptop GPU (~8 GB VRAM) and are sensitive to small placement changes; always re-run the top configs 3× and take the median.
- Per-run artifacts saved in /home/nate/AI/logs/high_conf_sweep_20260424_021144/ include: server logs (server-*.log), bench outputs (.json), and nvidia-smi traces (-nvidia-smi.log).

Quick checks
- View the best run output:
  cat /home/nate/AI/logs/high_conf_sweep_20260424_021144/qwen36_ngl10_kv_nc0-medium-nc0.json
- Tail the server log for the matching run:
  tail -n 200 /home/nate/AI/logs/high_conf_sweep_20260424_021144/server-qwen36_ngl10_kv_nc0-nc0.log

Recommendation
- Before publishing or benchmarking repeatedly, run each top config 3× and store the server log + nvidia-smi trace for each repeat under a descriptive subfolder. This repository keeps only launcher + docs; bench artifacts live in the logs directory.
