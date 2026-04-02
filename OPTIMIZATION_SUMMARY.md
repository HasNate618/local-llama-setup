# AI Model Optimization Summary

**Date:** April 2, 2026  
**Hardware:** RTX 4060 Laptop (8GB VRAM), i9-13900H, 38GB RAM  
**Goal:** Find optimal models and context sizes for coding agents + math help with multimodal support

## Final Configuration

### Active Models (17.4 GB total)

| Model | Purpose | Context | Speed | KV Cache | Notes |
|-------|---------|---------|-------|----------|-------|
| **Qwen3.5-9B Q4_K_M** | General reasoning | 64k | 34.8 t/s | q8_0 | Stable, good balance |
| **Qwopus Q5_K_S** | Reasoning-enhanced | 64k | 34.8 t/s | q8_0 | Slightly higher quality |
| **Sushi Coder RL Q4_K_M (text)** | Pure code generation | 64k | **41.7 t/s** | q8_0 | **Fastest coder** |
| **Sushi Coder RL Q4_K_M (multimodal)** | Math + images | **32k** | 36.97 t/s | q8_0 | Max stable with 879MB vision proj |
| **Sushi Coder RL BF16-mmproj** | Vision encoder | N/A | — | — | 880MB overhead |

### Key Findings

1. **32k is the maximum stable context for Sushi multimodal** on 8GB VRAM
   - 48k context causes CUDA OOM during vision projector initialization
   - Vision projector alone consumes 879MB, leaving ~6.9GB for KV cache
   - At 32k context with q8_0 KV: ~1.5GB KV cache + 202MB recurrent buffer = ~2GB total overhead

2. **Performance benchmarks (300-token generation)**
   - Text-only models achieve 34-42 tok/s
   - Sushi Coder (text) = fastest at 41.7 tok/s
   - Multimodal on 32k context = 36.97 tok/s (acceptable for math+vision)

3. **All 4 models are actively used** - no cleanup needed
   - Each model has a distinct use case
   - Total footprint: 17.4GB (manageable, leaves room for caching)

## Use Case Mapping

- **Coding Agent (long context)**: `llama sushi-coder` (64k, 41.7 t/s)
- **Reasoning tasks**: `llama reasoning` or `llama qwopus` (64k, with extended thinking)
- **Math help + diagrams**: `llama sushi` (32k multimodal, 36.97 t/s)

## Launcher Commands

```bash
# Start reasoning model (coding agent)
llama reasoning

# Start enhanced reasoning (Qwopus)
llama qwopus

# Start fastest coder (text-only)
llama sushi-coder

# Start multimodal (math + images)
llama sushi

# Stop all
llama stop

# Check status
llama status
```

## Technical Details

### Command-line optimizations per model:

**Reasoning models (64k context):**
- `-ctk q8_0 -ctv q8_0`: Quantized KV cache (saves ~1.5GB VRAM)
- `--reasoning on --reasoning-budget 1024`: Extended thinking enabled
- `--flash-attn on`: Flash Attention for speed
- `--threads 10`: Full P-core utilization

**Sushi text-only (64k context):**
- `-ctk q8_0 -ctv q8_0`: Quantized KV cache
- `--reasoning off`: Disabled (unnecessary for code)
- Temperature 0.6 + Top-p 0.95: Balanced creativity

**Sushi multimodal (32k context):**
- `-ctk q8_0 -ctv q8_0`: Quantized KV cache (32k context requires this)
- `--mmproj path/to/mmproj.gguf`: Vision encoder
- `--media-path $HOME`: Allow image uploads
- Temperature 0.2: Very precise for math problems

## Hardware Constraints Reached

- **Maximum multimodal context:** 32k (48k causes OOM)
- **Reason:** 879MB vision projector + 32k KV cache (1.5GB) = ~2.4GB, leaving minimal compute buffer

## Next Steps (Future)

- Could test 8-bit quantization on text models to reduce VRAM further
- DeltaCoder or Neo models remain undownloaded (decision postponed)
- Prompt caching not yet optimized (could improve repeated queries)
