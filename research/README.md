# Aran research prototype

Reproducible experiments behind the Aran design note.

```
./fetch_data.sh          # real public logs (Loghub, 16 systems, 32,000 lines)
python3 experiment.py    # writes results.json (about 3 minutes)
```

- `aran_core.py`: Verhoeff and Luhn checks, NIST SP 800-38G FF1 (passes the NIST sample vectors), checksum-complement tokens, exact min-entropy counts for masks.
- `test_core.py`: test vectors and invariants (`python3 -m pytest test_core.py`).
- `experiment.py`: E1 false alarms on real logs, E2 token separability, E3 leak attribution, E4 leakage of masking formats.

No real person's identifier is used anywhere. Identifiers in E2 and E3 are generated with valid checksums.

## AI and immune layers

```
./fetch_ai_data.sh       # CoNLL-2003, HiNER (Hindi), Hinglish NER tweets, UCI SMS, labelled BGL logs
pip install scikit-learn sklearn-crfsuite
python3 experiment_ai.py # writes results_ai.json (about 20 minutes on a laptop CPU)
python3 -m pytest test_ai.py
```

| File | Owner pair | What it is |
| --- | --- | --- |
| `synth.py` | all | Generated test identifiers (checksum-valid, belong to no one) and bank-style log lines in English, Hindi and Hinglish, with disjoint train and test templates and names |
| `ai/ner.py` | Bharadhwaj, Arun | CRF named-entity model for names and addresses in log text |
| `ai/context_clf.py` | Bharadhwaj, Arun | Context classifier that tells OTPs and UPI IDs from look-alike numbers and user@host strings |
| `ai/detector.py` | Bharadhwaj, Arun | Calibrated detector: fuses checksum, context and NER evidence into one probability per finding |
| `immune/ais.py` | Inbathamizhan, Aasif | Artificial immune system: V-detector negative selection, immune memory, self-tolerance |
| `immune/flows.py` | Inbathamizhan, Aasif | Simulated bank data-flow telemetry with six labelled exfiltration scenarios |
| `firewall/aran_firewall.py` | Inbathamizhan, Aasif | The wired firewall: detect, tokenise or destroy, count flows, hand them to the immune layer |
| `experiment_ai.py` | all | Experiments E5 to E9 |
| `results_ai.json` | all | Results of the last run |

Results are written up in [docs/research/ai-and-immune-layers.md](../docs/research/ai-and-immune-layers.md).

## Normaliser, registries and typo repair

```
python3 -m pytest test_registry.py
python3 experiment_registry.py      # E10 to E12, writes results_registry.json
```

| File | Owner pair | What it is |
| --- | --- | --- |
| `firewall/normalise.py` | Inbathamizhan, Aasif | Undoes escapes, other-script digits, separators, zero-width characters, split fields and base64, with a map back to the original line |
| `firewall/registry.py` | Inbathamizhan, Aasif | Cuckoo filter, own-customer registry, trace-bound OTP registry, typo neighbours |
| `ai/detector.py` | Bharadhwaj, Arun | Now adds registry evidence by Bayes' rule and scans every normalised view |
| `experiment_registry.py` | all | Experiments E10 to E12 |

Results are written up in [docs/research/normaliser-and-registries.md](../docs/research/normaliser-and-registries.md).

## Post-quantum upgrade

```
pip install "cryptography>=50"   # ships ML-KEM and ML-DSA
python3 -m pytest test_pqc.py test_shredder.py
python3 experiment_pqc.py        # writes results_pqc.json and pqc/cbom.json (about 1 minute)
python3 -m pqc.cbom ..           # cryptographic bill of materials for the repo
```

| File | Owner pair | What it is |
| --- | --- | --- |
| `pqc/hybrid.py` | Inbathamizhan, Aasif | Hybrid signatures (Ed25519 + ML-DSA-65), hybrid key sealing (X25519 + ML-KEM-768, X-Wing style combiner), Mosca's inequality |
| `pqc/cbom.py` | Inbathamizhan, Aasif | CBOM scanner: finds crypto primitives in Python code and marks what a quantum computer breaks; writes CycloneDX 1.6 |
| `experiment_pqc.py` | Inbathamizhan, Aasif | E17 retroactive un-erasure, E18 cost, E19 CBOM and Mosca table |

Report: [Post-quantum upgrade](../docs/research/post-quantum.md).
