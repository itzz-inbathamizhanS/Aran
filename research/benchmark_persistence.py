"""Benchmark persistence ON vs OFF on /api/process (1,000 requests).

Measures added latency, reporting p50 and p95.
"""

import os
import sys
import time
import numpy as np

# Ensure app/server and research are in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../app/server")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import engine as E

def run_benchmark(n=1000):
    print(f"--- Running Benchmark ({n} requests) ---")

    # 1. Benchmark In-Memory (Persistence OFF)
    print("1. Running with Persistence OFF (in-memory)...")
    e_off = E.Engine(n_customers=5, store_path=None, master_key=None)
    c_off = e_off.customers[sorted(e_off.customers)[0]]
    ref_off = c_off["ref"]
    aadhaar_off = c_off["AADHAAR"]

    latencies_off = []
    # Warm up 50 requests
    for _ in range(50):
        e_off.process(f"Aadhaar {aadhaar_off} kyc check", "core-banking", "kyc-archive", customer_ref=ref_off, purpose="KYC")

    for i in range(n):
        t0 = time.perf_counter()
        e_off.process(f"Aadhaar {aadhaar_off} request {i}", "core-banking", "kyc-archive", customer_ref=ref_off, purpose="KYC")
        t1 = time.perf_counter()
        latencies_off.append((t1 - t0) * 1000.0)
    e_off.close()

    p50_off = float(np.percentile(latencies_off, 50))
    p95_off = float(np.percentile(latencies_off, 95))
    mean_off = float(np.mean(latencies_off))

    # 2. Benchmark Persistence ON
    print("2. Running with Persistence ON (dual SQLite WAL)...")
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        data_db = os.path.join(tmpdir, "aran.db")
        master_key = "b" * 64
        e_on = E.Engine(n_customers=5, store_path=data_db, master_key=master_key)
        c_on = e_on.customers[sorted(e_on.customers)[0]]
        ref_on = c_on["ref"]
        aadhaar_on = c_on["AADHAAR"]

        latencies_on = []
        # Warm up 50 requests
        for _ in range(50):
            e_on.process(f"Aadhaar {aadhaar_on} kyc check", "core-banking", "kyc-archive", customer_ref=ref_on, purpose="KYC")

        for i in range(n):
            t0 = time.perf_counter()
            e_on.process(f"Aadhaar {aadhaar_on} request {i}", "core-banking", "kyc-archive", customer_ref=ref_on, purpose="KYC")
            t1 = time.perf_counter()
            latencies_on.append((t1 - t0) * 1000.0)
        e_on.close()

    p50_on = float(np.percentile(latencies_on, 50))
    p95_on = float(np.percentile(latencies_on, 95))
    mean_on = float(np.mean(latencies_on))

    delta_p50 = p50_on - p50_off
    delta_p95 = p95_on - p95_off
    delta_mean = mean_on - mean_off

    print("==========================================================")
    print(f"BENCHMARK RESULTS ({n} requests on engine.process):")
    print(f"  Persistence OFF: p50={p50_off:.3f} ms, p95={p95_off:.3f} ms, mean={mean_off:.3f} ms")
    print(f"  Persistence ON:  p50={p50_on:.3f} ms, p95={p95_on:.3f} ms, mean={mean_on:.3f} ms")
    print(f"  Added Latency:   Δp50={delta_p50:+.3f} ms, Δp95={delta_p95:+.3f} ms, Δmean={delta_mean:+.3f} ms")
    print(f"  Target (< 3.0 ms added): {'PASS' if delta_p50 < 3.0 and delta_p95 < 3.0 else 'CHECK'}")
    print("==========================================================")

    return {
        "p50_off": p50_off,
        "p95_off": p95_off,
        "p50_on": p50_on,
        "p95_on": p95_on,
        "delta_p50": delta_p50,
        "delta_p95": delta_p95,
    }

if __name__ == "__main__":
    run_benchmark(1000)
