# Local LLM Setup

llama.cpp server helper for NixOS with MTP (Multi-Token Prediction) support.

## Hardware

- **GPU**: NVIDIA RTX 4060 (8GB VRAM)
- **CPU**: Intel i9-13900H (20 threads)
- **RAM**: 38GB
- **OS**: NixOS unstable

## Quick Start

```bash
./model_launcher.sh ornith    # Start Ornith (coding, ~35-46 t/s)
./model_launcher.sh qwen      # Start Qwen uncensored (~35 t/s)
./model_launcher.sh stop      # Stop server
./model_launcher.sh status    # Check if running
```

## Models

| Model | File | Size | Speed | Use |
|-------|------|------|-------|-----|
| ornith | ornith-1.0-35b-Q4_K_M-MTP.gguf | 21G | 35-46 t/s | Coding |
| qwen | Qwen3.6-35B-A3B-uncensored-heretic-... | 21G | 35 t/s | General uncensored |

Both use MTP (Multi-Token Prediction) via ik_llama.cpp for 3x speedup.

## Performance

| Config | tg (t/s) | Acceptance | Notes |
|--------|----------|------------|-------|
| Ornith MTP (n_max=3) | 39-46 | 73-94% | Best for coding |
| Qwen uncensored MTP (n_max=3) | 35 | 71-75% | Best for general chat |
| Qwen uncensored (no MTP) | 13 | — | Baseline |

## Why ik_llama.cpp?

Main llama.cpp crashes with MTP on CUDA (`ggml_cuda_mul_mat_vec_q` illegal memory access). This is a known bug — not driver-specific, not toolkit-specific. ik_llama.cpp fork has the fix.

### Build ik_llama.cpp

**Option 1: Nix flake (recommended)**
```bash
nix build
# Binary at ./result/bin/llama-server
```

**Option 2: Manual build**
```bash
cd ~/AI
git clone https://github.com/ikawrakow/ik_llama.cpp.git
cd ik_llama.cpp
sed -i '1i#include <cstdint>' ggml/src/iqk/iqk_common.h
mkdir build && cd build
NIXPKGS_ALLOW_UNFREE=1 NIX_ENFORCE_NO_NATIVE=0 nix-shell -p cmake pkg-config git gcc cudaPackages.cudatoolkit cudaPackages.cudnn cudaPackages.libcublas --run \
  "cmake .. -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=ON -DLLAMA_BUILD_SERVER=ON -DCMAKE_C_FLAGS='-mavx2 -mfma -mbmi -mbmi2 -mpopcnt -mf16c' -DCMAKE_CXX_FLAGS='-mavx2 -mfma -mbmi -mbmi2 -mpopcnt -mf16c' && make -j\$(nproc)"
```

## ik_llama.cpp Flag Differences

ik_llama.cpp uses different flags than main llama.cpp:
- `--fit` is boolean (no `on`/`off` argument)
- `--spec-type "mtp:n_max=3,p_min=0.0"` (not `--spec-type draft-mtp`)
- `-cram 0` (not `--cache-ram 0`)
- `-b 512 -ub 256` (not `--batch-size`/`--ubatch-size`)

## Port

Default: 11434 (configurable in model_launcher.sh)

## File Structure

```
~/AI/
├── local-llama-setup/     # This repo
│   ├── model_launcher.sh  # Main script
│   ├── flake.nix          # Nix flake for building ik_llama.cpp
│   └── README.md
├── ik_llama.cpp/          # Built binary (not tracked)
├── models/                # GGUF files (not tracked)
└── logs/                  # Server logs (not tracked)
```

## Development

- Keep only `model_launcher.sh`, `flake.nix`, `README.md` tracked
- Models, logs, builds remain on disk but untracked
- `.gitignore`: `models/ logs/ ik_llama.cpp/ atomic-llama.cpp/ *.log *.pid`

## Troubleshooting

- **"CUDA error: illegal memory access"**: Use ik_llama.cpp, not main llama.cpp
- **Server won't start**: Check `llama status` and `llama logs`
- **Port in use**: `llama stop` or `pkill -f llama-server`
- **Model not found**: Ensure GGUF files are in `~/AI/models/`

## Benchmarks

Tested on RTX 4060 (8GB VRAM) with ik_llama.cpp:
- Ornith 35B MTP: 39-46 t/s generation, 73-94% acceptance
- Qwen 3.6 35B uncensored MTP: 35 t/s generation, 71-75% acceptance
- Qwen 3.6 35B uncensored (no MTP): 13 t/s baseline
- 128K context: ~15% speed drop, still 2.5x faster than no MTP
