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
