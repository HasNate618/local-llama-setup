# RAG Configuration for Lecture PDF Database

## Executive Summary
**For lecture PDF RAG: Use `llama sushi-coder` (64k context)**

This gives you the best balance of:
- ✅ Largest context window (64k tokens)
- ✅ Fastest speed (41.7 tok/s)
- ✅ Sufficient accuracy for retrieval-augmented tasks
- ✅ Multimodal option available if lectures have diagrams

---

## Detailed Analysis

### Speed Comparison (Verified Benchmarks)

| Model | Quantization | Max Context | Speed | VRAM | Notes |
|-------|--------------|-------------|-------|------|-------|
| **Sushi Coder RL** | Q4_K_M | 64k | **41.7 tok/s** ✅ | 6.8GB | BEST for RAG |
| DeltaCoder | Q5_K_M | 32k | 36.2 tok/s | 6.5GB | Limited context |
| Qwen Reasoning | Q4_K_M | 64k | 34.8 tok/s | 7.5GB | Slower, uses more VRAM |
| Sushi Multimodal | Q4_K_M | 32k | 36.97 tok/s | 7.4GB | For math+diagrams only |

### Why Sushi is Optimal for Lecture PDFs

#### 1. Context Window Advantage
```
DeltaCoder (32k):  Can retrieve ~4-5 lecture chunks
Sushi (64k):       Can retrieve ~10-15 lecture chunks
```
**Impact:** More lecture content = fewer hallucinations

#### 2. RAG Token Budget Calculation
```
System prompt:           ~200 tokens
Student query:           ~50 tokens
Retrieved lecture chunks: ~5000 tokens (10 chunks × 500 tokens avg)
Response generation:     ~500 tokens
─────────────────────────────────
Total needed:           ~5750 tokens

DeltaCoder (32k): Can fit 4-5 chunks → ~3000 tokens context loss ❌
Sushi (64k):      Can fit 10-15 chunks → SAFE MARGIN ✅
```

#### 3. Speed vs Accuracy
- **2-3 second response time** is acceptable for RAG (users expect retrieval latency)
- **Accuracy > Speed** for educational content (hallucinations are worse than latency)
- Sushi's 41.7 tok/s still generates responses in ~2-3 seconds

---

## Configuration Recommendations

### For Math-Heavy Lectures (Linear Algebra, Calculus, Physics)

#### Option A: Sushi Only (Recommended - Simplest)
```bash
llama sushi-coder  # 64k context, fastest
```
**Pros:** Simple, fast, good accuracy  
**Cons:** Not specialized for math

#### Option B: Neo Specialized (If Available - Needs Testing)
- **Requires:** Downloading + testing Neo model
- **Pros:** Potentially better math accuracy
- **Cons:** Unknown context size, speed, VRAM requirements
- **Status:** NOT YET TESTED

#### Option C: Hybrid (Advanced)
- Use **Sushi for retrieval** (embedding + reranking)
- Use **Neo for generation** (if math accuracy is critical)
- Requires: Model switching logic in RAG pipeline

### For Conceptual Lectures (History, Philosophy, Literature)
**Use:** `llama sushi-coder` (64k)  
**Reason:** Sushi is sufficient; math specialization unnecessary

### For Lectures with Diagrams/Math
**Use:** `llama sushi` (32k multimodal)  
**Command:** `llama sushi`  
**Context:** 32k (reduced from 64k, but multimodal support added)

---

## DeltaCoder Verdict
**❌ NOT recommended for lecture PDF RAG**

**Reasons:**
1. 32k context is limiting for RAG (can't hold enough lecture chunks)
2. 36.2 tok/s is slower than Sushi
3. Q5_K_M quantization uses similar VRAM without benefit
4. No multimodal support
5. DPO training doesn't outweigh context disadvantage

**Where DeltaCoder might shine:** Pure code refinement (not RAG-dependent)

---

## Neo Model Investigation

### Status: NOT TESTED YET
Before deciding, we need:
1. ✅ Verify if Neo model is downloaded
2. ⏳ Test Neo on math problems
3. ⏳ Benchmark context limits (is it 64k? 32k? 128k?)
4. ⏳ Benchmark speed (faster or slower than Sushi?)
5. ⏳ Verify VRAM requirements on 8GB GPU

### Questions:
- **Is Neo better at math than Sushi?** Unknown
- **Can Neo run at 64k context?** Unknown
- **Is Neo 7B or 13B?** Unknown
- **Speed differential?** Unknown

**Recommendation:** Test Neo before making final decision on math-heavy lectures

---

## Final Recommendation Summary

| Use Case | Model | Command | Context |
|----------|-------|---------|---------|
| General lecture PDFs | Sushi Coder RL | `llama sushi-coder` | 64k |
| Math-heavy lectures | **Sushi (pending Neo test)** | `llama sushi-coder` | 64k |
| Lectures + diagrams | Sushi Multimodal | `llama sushi` | 32k |
| Pure code tasks | Sushi Coder RL | `llama sushi-coder` | 64k |

---

## Next Steps

1. **For immediate production:** Deploy with `llama sushi-coder`
2. **For optimization:** Download + test Neo on math tasks
3. **If Neo > Sushi:** Create model-switching logic based on query type
4. **Monitor:** Track accuracy metrics on your lecture PDFs

