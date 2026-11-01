# Aran Learn 29: Code Audits and Testing

**For:** everyone. Aasif first (security checks), Inbathamizhan for the fixes, Arun and Bharadhwaj for the model-related test. **Time:** about 1 hour with practice. **Before this:** Learn 1 (Python and tools), Learn 8 (web APIs and proxies) and Learn 26 (SaaS).

A code audit is a careful, step by step check of a whole project: does it work, is it safe, is it fast enough, is it easy to change. This doc explains the steps used in the November 2026 audit of Aran, so you can repeat them yourselves before every demo.

## 1. Look before you touch

Draw the map first: which programs run, on which ports, what each one stores, who calls whom. For Aran that is the core (8000), Aran Cloud (8100), Bank A (9001) and Bank B (9002). See [ARCHITECTURE.md](../../artifacts/Code%20audit/ARCHITECTURE.md).

**Everyday example:** before repairing a house you walk through every room and note the pipes and wires. You do not start by knocking down a wall.

## 2. Get a baseline

Run every test **before** changing anything. Then you know which failures you caused and which were already there.

```bash
bash scripts/run_demo.sh                        # starts all four services
python -m pytest -q demo_bank aran_sdk aran_cloud app/server
cd research && PYTHONPATH=.:../app/server python -m pytest -q .
```

## 3. Let tools find the easy things

| Tool | What it finds | Command |
| --- | --- | --- |
| ruff | unused imports, undefined names, likely bugs | `ruff check --select F,B .` |
| bandit | risky Python patterns (pickle, SQL built from strings) | `bandit -r app/server aran_cloud -ll` |
| pip-audit | Python libraries with known security holes | `pip-audit -r app/server/requirements.txt` |
| npm audit | JavaScript libraries with known holes | `cd app/web && npm audit` |

A tool warning is a **question**, not a verdict. Bandit flagged five SQL queries built with f-strings; reading them showed every value was a bound `?` parameter, so they were safe (a "false positive").

## 4. Try to break it on purpose

Send the inputs a careless or hostile user would send: an empty name, a name of only spaces, a 30,000-character text, a header with an accented letter, a customer that does not exist, 80 requests at the same moment. Each of these found a real bug in Aran, for example an all-space name crashed the console with error 500.

**HTTP status codes tell the caller whose fault it is:** 4xx means "your request was wrong" (400 bad input, 401 not logged in, 403 not allowed, 404 not found, 422 invalid field, 429 too many requests). 5xx means "the server failed" (500 crash, 502 the server behind me failed). Aran Cloud used to answer 502 for a simple "customer not found", which made clients think the service was down.

## 5. The OWASP Top 10 in one table

OWASP is a global group that lists the ten most common web security mistakes. The ones that mattered for Aran:

| Mistake | Plain meaning | What we check in Aran |
| --- | --- | --- |
| Broken access control | Someone sees or changes what is not theirs | Every Cloud query filters by the caller's workspace |
| Injection | Input is treated as code (SQL, HTML) | Bound SQL parameters; `esc()` before `innerHTML` |
| Insecure design | The plan itself leaks | Bank B used to send the core's secret to the cloud |
| Misconfiguration | Unsafe defaults | CORS, security headers, CSP |
| Vulnerable components | Old libraries with known holes | Pillow upgraded to 13.0.0 |

## 6. Reproduce, fix, re-test

For every bug: show it failing on the old code, change as little as possible, show it passing on the new code, then run all the other tests again to make sure nothing else broke. Never delete or weaken a test to make it pass. If a test fails for a reason you cannot fix now, write it down (the flaky "versus" test is a model limit, recorded as A-21).

## 7. Practice

1. Start the stack and run `curl -X POST localhost:8000/api/customers -H 'content-type: application/json' -d '{"name":"   "}'`. You should now get 200, not 500.
2. Run `ruff check --select F .` and explain one warning to a teammate.
3. Read one row of the issue register in [AUDIT_REPORT.md](../../artifacts/Code%20audit/AUDIT_REPORT.md) and find the fix in the code.
