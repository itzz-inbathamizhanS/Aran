# Aran Learn 28: Dashboards and Metrics

**For:** everyone. Inbathamizhan first (the dashboard UI), Aasif for the numbers behind it. **Time:** about 1 hour with practice. **Before this:** Learn 4 (probability for detection), Learn 17 (wiring a design to a live API) and Learn 26 (SaaS).

A bank buying Aran will open the Aran Cloud dashboard every morning. It must answer three questions in five seconds: **Is Aran working? Is it protecting us? Is it slowing payments?** This doc explains how a dashboard gets its numbers and how to show them honestly.

## 1. Metrics, events and logs

| Kind | What it is | Example |
|---|---|---|
| **Event** | One thing that happened, with details | "Txn TXN-B-123 protected 3 values in 2.1 ms" |
| **Metric** | A number added up over time | "4,812 transactions protected in the last hour" |
| **Log** | Free text written by a program | `INFO protect ok tenant=t_b7 ms=2.1` |

Aran Cloud stores **events** (`usage_events`, one row per call) and works out **metrics** from them when the dashboard asks. At large scale you keep metrics pre-counted in time buckets instead (section 3).

## 2. The four kinds of metric

- **Counter**: only goes up. Transactions processed, values tokenised. You usually show its **rate**: per minute, per day.
- **Gauge**: goes up and down. Open alerts, keys alive, queue length.
- **Ratio**: one count over another. **Coverage** = values tokenised ÷ values found. **Error rate** = failed calls ÷ all calls.
- **Distribution**: many values, like latency. You show **percentiles**, not the average.

### Why percentiles, not averages

Ten payments take 2, 2, 2, 2, 2, 2, 2, 2, 2 and 80 ms. The **average** is 9.8 ms, which describes none of them. The **median (p50)** is 2 ms: a normal payment. The **p95** is the time 95% of payments beat; it shows the slow tail. Banks write SLAs on p95 or p99.

```python
import numpy as np
lat = [2, 2, 2, 2, 2, 2, 2, 2, 2, 80]
np.percentile(lat, 50), np.percentile(lat, 95)   # (2.0, 44.9)
```

## 3. Time buckets

To draw "transactions per minute for the last hour", count the events in each one-minute **bucket**:

```sql
SELECT CAST(at / 60 AS INTEGER) * 60 AS minute, COUNT(*) AS n
FROM usage_events
WHERE tenant_id = ? AND at > strftime('%s','now') - 3600
GROUP BY minute ORDER BY minute;
```

Two traps:
- **Empty buckets.** A minute with no traffic returns no row. Fill it with 0, or the chart draws a line straight across the gap and lies.
- **The current bucket is not finished.** The last minute always looks low. Mark it as "in progress" or leave it out.

## 4. What the Aran Cloud dashboard should show

| Question | Metric | Kind |
|---|---|---|
| Is it working? | Calls per minute, error rate, last call time | Counter rate, ratio |
| Is it protecting us? | Values tokenised, coverage %, raw values passed, by type (Aadhaar, PAN, UPI id, card) | Counters, ratio |
| Is it slowing payments? | Added latency p50 / p95 per minute against the budget | Distribution |
| Where does data go? | Values per destination (logs, fraud, analytics, AI) | Counters by label |
| Are we compliant? | Erasure receipts, detokenise reads by person, audit chain verified | Counters, gauge |
| What does it cost? | Transactions this month against the plan | Counter vs. limit |

A **label** (or dimension) splits a metric: transactions by **channel** (UPI, card…), by **destination**, by **bank**. Keep labels to a small fixed list; never use a customer id as a label.

## 5. Show numbers honestly

- **Every number says its window.** "4,812 (last hour)", not "4,812".
- **Every chart starts its y-axis at 0** for counts, so a small change does not look huge.
- **Say when there is no data.** "No transactions yet" is not the same as "0 protected".
- **Say how fresh it is.** "Updated 3 s ago"; when the server is unreachable, say so instead of freezing old numbers (Learn 25, section 4).
- **Colour means status, not decoration.** Green = within target, amber = close, red = broken. Never colour alone: add an icon or word for colour-blind readers.
- **One tenant only.** The dashboard of Bank B must never include Bank A's numbers (Learn 26).

## 6. SLIs, SLOs and alerts

- **SLI** (service level indicator): a metric that measures what customers feel. Example: p95 added latency.
- **SLO** (objective): the target. "p95 added latency under 10 ms, 99.9% of minutes this month."
- **Error budget**: how much you may miss. 0.1% of a month is about 43 minutes.
- **Alert**: tells a person when the SLO is in danger. Alert on symptoms ("p95 over 10 ms for 5 minutes"), not on causes ("CPU 80%").

## 7. Live updates

The dashboard can get fresh numbers in three ways:

| Way | How | Good for |
|---|---|---|
| Polling | Ask every few seconds | Simple; what Aran does today |
| Server-Sent Events | The server keeps one connection open and pushes updates | Live counters and feeds |
| WebSocket | Two-way open connection | Chat, collaborative tools |

Polling every 2 to 5 seconds is enough for a bank dashboard. Stop polling when the tab is hidden.

## Exercises

1. Latencies (ms): 1, 1, 2, 2, 2, 3, 3, 4, 9, 60. Work out the average, p50 and p95. Which would you put in an SLA?
2. Run the bucket query above on `aran_cloud/cloud.db` for your workspace. Which minutes are missing, and how will you fill them?
3. Bank B processed 1,200 transactions; Aran found 3,100 identifiers and tokenised 3,094. What is the coverage, and what would you show next to it?
4. Your SLO is 99.9% of minutes under 10 ms. In a 30-day month, how many bad minutes can you have?

## Words to know

| Word | Meaning |
|---|---|
| Event | One thing that happened, stored with its details. |
| Metric | A number summed or measured over time. |
| Counter | A metric that only goes up. |
| Gauge | A metric that goes up and down. |
| Rate | A counter's change per unit of time. |
| Percentile (p50, p95) | The value that 50% or 95% of measurements are below. |
| Bucket | A fixed slice of time that events are counted in. |
| Label (dimension) | A field that splits a metric, like channel or destination. |
| Coverage | The share of found identifiers that were protected. |
| SLI / SLO | What you measure / the target you promise. |
| Error budget | How much the SLO may be missed. |
| Server-Sent Events | A one-way open connection the server pushes updates over. |
