---
tags: [thread, aran, pqc, cryptography]
date: 2026-10-16
status: done
---
# Post-quantum cryptography

**Prompt:** how to implement post-quantum cryptography (PQC) in Aran to make it stronger; research it.

- Learning doc first: [Learn 13: Post-Quantum Cryptography](../../docs/learning/13-post-quantum-cryptography.md).
- Research doc: [Post-quantum upgrade](../../docs/research/post-quantum.md), roadmap item 14, experiments E17 to E19.
- Built: hybrid Ed25519 + ML-DSA-65 erasure receipts with downgrade protection (`research/firewall/shredder.py`), X25519 + ML-KEM-768 key sealing (`research/pqc/hybrid.py`), CBOM scanner (`research/pqc/cbom.py`), AES-256 FF1 key in the live console. The console shows both receipt signatures.
- Key finding: crypto-shredding can be undone later if a destroyed key ever travelled under X25519 (E17: 100% of 1,200 erased values recovered vs 0% with the hybrid).
- Cost: receipts 904 to 8,155 bytes; 5,657 to 1,930 verifications per second; FF1 about 3% slower.
- Next: hybrid TLS (X25519MLKEM768) in front of the proxy and AI gateway; SLH-DSA on Merkle roots; legal view.

Back to [[Threads]]
