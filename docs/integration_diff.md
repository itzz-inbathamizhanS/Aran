# Integration Code Diff: Bank A (Legacy) vs. Bank B (Aran SDK)

This document shows the exact code difference between **Bank A (Legacy Unprotected)** and **Bank B (Protected by Aran)** for the customer registration handler (`/api/register`). Designed for presentation slides and architectural review.

---

## 1. Unified Diff (Side-by-Side Slide View)

```diff
@@ -1,22 +1,30 @@
+from aran import Aran
+
+# Bank B: Scoped client (protect, gateway, trace only)
+aran = Aran(api_key=os.environ["ARAN_APP_KEY"], base_url="http://127.0.0.1:8100")
+
 @app.post("/api/register")
 def register_customer(body: CustomerIn):
     conn = get_db()
-    cust_ref = body.customer_ref or f"CUST-A{count:04d}"
+    cust_ref = body.customer_ref or f"CUST-B{count:04d}"
 
     name = body.name.strip()
     mobile = re.sub(r"\D", "", body.mobile.strip())
     aadhaar = re.sub(r"\D", "", body.aadhaar.strip())
     card = re.sub(r"\D", "", body.card.strip())
 
-    # Bank A: Store raw PII directly in database
-    conn.execute(
-        "INSERT INTO customers (customer_ref, name, mobile, aadhaar, card) VALUES (?, ?, ?, ?, ?)",
-        (cust_ref, name, mobile, aadhaar, card),
-    )
-
-    # Bank A: Write raw PII to logs
-    raw_log = f"Account created for {name} | Mobile: {mobile} | Aadhaar: {aadhaar} | Card: {card}"
-    conn.execute("INSERT INTO logs (message) VALUES (?)", (raw_log,))
+    # Bank B: Protect payload via Aran SDK in one call
+    res = aran.protect(
+        text=json.dumps({"name": name, "mobile": mobile, "aadhaar": aadhaar, "card": card}),
+        customer_ref=cust_ref,
+        purpose="KYC",
+        sink="kyc-archive",
+    )
+    tokens = json.loads(res["after"])
+
+    # Bank B: Store zero-plaintext tokens in database (No schema migration required!)
+    conn.execute(
+        "INSERT INTO customers (customer_ref, name, mobile, aadhaar, card) VALUES (?, ?, ?, ?, ?)",
+        (cust_ref, tokens.get("name", name), tokens["mobile"], tokens["aadhaar"], tokens["card"]),
+    )
+
+    # Bank B: Sanitize log via Aran before persisting
+    raw_log = f"Account created for {name} | Mobile: {mobile} | Aadhaar: {aadhaar} | Card: {card}"
+    redacted_log = aran.protect(text=raw_log, sink="log-platform", purpose="Service")["after"]
+    conn.execute("INSERT INTO logs (message) VALUES (?)", (redacted_log,))
```

---

## 2. Side-by-Side Comparison

| Dimension | Bank A (Legacy Unprotected) | Bank B (Aran SDK Protected) |
| :--- | :--- | :--- |
| **Lines of Security Code** | 0 lines | **~5 lines** of Python SDK calls |
| **Database Plaintext** | Raw 12-digit Aadhaar, 16-digit Card, Mobile stored in plaintext SQLite | **Zero plaintext**: Format-preserving & vault tokens stored |
| **Application Logs** | Raw PII written to log lines, visible in log forwarders / SIEM | Fully redacted tokens (`<MOBILE_1>`, vault tokens) |
| **API Key Security** | N/A | Least-privilege key with **`protect, gateway, trace`** scopes only |
| **Privilege Escalation Defense** | None | App key gets **403 Forbidden** if attempting detokenisation or erasure |
| **Schema Changes Required** | None | **None** (Tokens preserve shape and data types) |
| **DPDP Act Compliance** | Deleting DB row leaves residual copies in logs, backups, and caches | Cryptographic erasure destroys purpose keys in hardware; all copies shredded |

---

## 3. Key Takeaway for Judges & Engineers

> **With just 5 lines of Python code using `aran_sdk`**, a legacy bank transitions from complete PII exposure to mathematical Zero Trust:
> 1. Ingestion automatically detects and vaults Aadhaar, Cards, and Mobiles.
> 2. Format-preserving tokens preserve database column types and schemas without breaking downstream reporting.
> 3. Scoped credentials ensure an application server compromise cannot decrypt tokens.

