# Model Launcher — llama.cpp server helper

Lightweight launcher for running local llama.cpp model servers with MTP (Multi-Token Prediction) support on NixOS.

## Purpose

- Provide a single entrypoint (`model_launcher.sh`) to start/stop local llama.cpp servers
- Use ik_llama.cpp fork for MTP CUDA fixes (main llama.cpp crashes on RTX 4060)
- Support both coding (Ornith) and general (Qwen uncensored) models with MTP speed

## Prerequisites

- Linux with NVIDIA GPU (tested on RTX 4060 ~8GB VRAM)
- ik_llama.cpp built at: `~/AI/ik_llama.cpp/build/bin/llama-server`
- Models under `~/AI/models/`
- Tools: bash, curl

## Quick Start

```bash
./model_launcher.sh ornith    # Start Ornith (coding, ~35-46 t/s)
./model_launcher.sh qwen      # Start Qwen uncensored (~35 t/s)
./model_launcher.sh stop      # Stop server
```

## Models

| Model | File | Speed | Use |
|-------|------|-------|-----|
| ornith | ornith-1.0-35b-Q4_K_M-MTP.gguf (21G) | 35-46 t/s | Coding |
| qwen | Qwen3.6-35B-A3B-uncensored-heretic-... (21G) | 35 t/s | General uncensored |

## Performance (RTX 4060 8GB)

| Config | tg (t/s) | Acceptance |
|--------|----------|------------|
| Ornith MTP (n_max=3) | 39-46 | 73-94% |
| Qwen uncensored MTP (n_max=3) | 35 | 71-75% |
| Qwen uncensored (no MTP) | 13 | — |

**MTP gives 3x speedup over non-MTP!**

## Why ik_llama.cpp?

Main llama.cpp crashes with MTP on CUDA (`ggml_cuda_mul_mat_vec_q` illegal memory access). This is a known bug — not driver-specific, not toolkit-specific. ik_llama.cpp fork has the fix.

Built with: `NIXPKGS_ALLOW_UNFREE=1 NIX_ENFORCE_NO_NATIVE=0 nix-shell -p cmake pkg-config git gcc cudaPackages.cudatoolkit cudaPackages.cudnn cudaPackages.libcublas --run "..."`

## Key Flags

ik_llama.cpp uses different flags than main llama.cpp:
- `--fit` is boolean (no `on`/`off` argument)
- `--spec-type "mtp:n_max=3,p_min=0.0"` (not `--spec-type draft-mtp`)
- `-cram 0` (not `--cache-ram 0`)
- `-b 512 -ub 256` (not `--batch-size`/`--ubatch-size`)

## Port

Default: 11434 (configurable in model_launcher.sh)

## Development

- Keep only `model_launcher.sh` tracked in git
- Models, logs remain on disk but untracked
- `.gitignore`: `models/ llama.cpp/ logs/`
