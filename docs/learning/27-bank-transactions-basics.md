# Aran Learn 27: Bank Transactions for Beginners

**For:** everyone. Arun and Bharadhwaj first (they build the two banks). **Time:** about 1 hour with practice. **Before this:** Learn 2 (Indian identifiers and check digits) and Learn 26 (SaaS and multi-tenancy).

Today Bank A and Bank B only register customers, chat and erase. Real banks spend most of their day moving money. To sell Aran as a product for **transaction systems**, the demo banks must make payments, and Aran must protect every identifier that travels with a payment without slowing it down. This doc explains how a bank payment works.

## 1. What a transaction is

A **transaction** is one movement of money from a **payer** (who pays) to a **payee** (who is paid). Every transaction has:

| Field | Example | Personal data? |
|---|---|---|
| Transaction id | `TXN-B-000123` | No |
| Amount and currency | ₹2,450.00, INR | No |
| Payer account | `50100234567890` (Bank B) | **Yes** |
| Payee | `rekha413@unionbank` (a UPI id) | **Yes** |
| Channel | UPI, IMPS, NEFT, RTGS, card | No |
| Status | pending, success, failed, reversed | No |
| Time | 2026-11-01 09:30:12 IST | No |
| Remarks | "Rent Nov, PAN ABCDE1234F" | **Often** |

The money fields are needed to move money. The personal fields are needed too, but they then get copied into logs, fraud tools, analytics, support tickets and AI chat. That copying is where Aran comes in.

## 2. India's payment rails

A **payment rail** is the network that carries a payment between banks.

| Rail | Speed | Limit | Identifies the payee by |
|---|---|---|---|
| **UPI** | Seconds, 24×7 | Usually ₹1 lakh | UPI id (`name@bank`) or mobile number |
| **IMPS** | Seconds, 24×7 | ₹5 lakh | Account number + IFSC, or mobile + MMID |
| **NEFT** | Batches every 30 minutes | No limit | Account number + IFSC |
| **RTGS** | Real time, large amounts | From ₹2 lakh | Account number + IFSC |
| **Card** | Seconds | Card limit | 16-digit card number (PAN) |

**IFSC** is an 11-character branch code (`HDFC0001234`). It is public, not personal. A **card number** passes the **Luhn** check (Learn 2), so Aran can tell a real one from a random 16-digit number.

## 3. The life of one payment

```
Customer app ──► Bank B core banking ──► Payment switch ──► NPCI (UPI) ──► Payee bank
                     │                      │
                     ├─► transaction log    ├─► fraud check
                     ├─► notification SMS   └─► analytics
                     └─► support / AI chat
```

1. **Initiate**: the customer enters a payee and amount.
2. **Authorise**: the bank checks the PIN and that the balance covers the amount.
3. **Fraud check**: a risk score (new payee? odd hour? big amount?). High risk means hold or decline.
4. **Clear**: the rail passes the message to the payee bank.
5. **Settle**: the banks actually move the money between themselves (for UPI, in batches later in the day).
6. **Notify**: SMS and app notification to both sides.

Each arrow is a place where personal data is copied. Aran sits on those arrows.

## 4. A ledger, not a balance column

Banks never just change a "balance" number. They write a **ledger**: a list of entries that is only ever added to, never edited. Each transaction writes two entries that add up to zero. This is **double-entry bookkeeping**:

| Txn | Account | Debit | Credit |
|---|---|---|---|
| TXN-B-000123 | Customer 5010…7890 | ₹2,450 | |
| TXN-B-000123 | UPI settlement account | | ₹2,450 |

The balance is the sum of the entries. If the sum of all debits and credits is not zero, something is wrong. A refund does not delete a row; it adds a **reversal** row.

## 5. Idempotency: never pay twice

Networks fail. If the app sends "pay ₹2,450" and the answer is lost, the app tries again. Without care, the customer pays twice. The fix is an **idempotency key**: a unique id the app sends with the request. The bank stores it, and a second request with the same key returns the first result instead of paying again.

```http
POST /api/transactions
Idempotency-Key: 7f3c9a10-…
{"payee": "rekha413@unionbank", "amount": 2450, "channel": "UPI"}
```

Aran's calls must be idempotent too: protecting the same text twice must give the same tokens.

## 6. Where Aran fits, and the one rule

Aran protects the **copies**, not the money movement itself:

- The **ledger** keeps what the law needs, but logs, analytics, fraud dashboards and support tools get **tokens** instead of account numbers and UPI ids.
- Tokens are **deterministic** inside one bank (the same account always gives the same token), so the fraud team can still count "5 payments to this payee today" without seeing who the payee is.
- When a customer asks to be forgotten (DPDP Act), the bank destroys their key; every copied token becomes unreadable, but the ledger rows the law requires stay.

**The one rule:** Aran must **never stop a payment**. If Aran Cloud is slow or down, the payment still goes through, and the copy is held back (or sent masked) until Aran answers. This is called **fail-safe for the money, fail-closed for the copies**. We also set a **latency budget**: Aran may add at most a few milliseconds to a payment.

## 7. Bank A and Bank B

The demo has two banks so people can see the difference side by side:

| | Bank A (legacy) | Bank B (Aran) |
|---|---|---|
| Transaction log | Raw account numbers and UPI ids | Tokens |
| Fraud dashboard | Sees every customer's identity | Sees patterns, not people |
| Support chat and AI | Gets the raw remarks ("PAN ABCDE1234F") | Gets `<PAN_1>` |
| Breach dump | Full identities of payers and payees | Tokens that are useless outside Bank B |
| Erasure | Impossible without breaking the ledger | Destroy the key, keep the ledger |

## Exercises

1. A UPI payment of ₹2,450 from account 5010…7890 to `rekha413@unionbank` succeeds. Write the two ledger rows.
2. The app sends the same payment twice with the same idempotency key. What should the second answer be, and how many ledger rows exist afterwards?
3. List every identifier in this remark and say which rail it belongs to: `"Refund to 4111 1111 1111 1111, call 9876543210, UPI asha@okaxis"`.
4. Aran Cloud takes 2 seconds to answer. Should the payment wait? What happens to the log line?

## Words to know

| Word | Meaning |
|---|---|
| Transaction | One movement of money from a payer to a payee. |
| Payment rail | The network that carries payments between banks (UPI, IMPS, NEFT, RTGS, card). |
| NPCI | National Payments Corporation of India, which runs UPI and IMPS. |
| UPI id (VPA) | A payment address like `name@bank`. |
| IFSC | An 11-character code for a bank branch; public. |
| Authorise | Check the customer may make this payment. |
| Settle | Move the money between banks for real. |
| Ledger | An add-only list of money entries. |
| Double entry | Every transaction writes a debit and a credit that add to zero. |
| Reversal | A new entry that undoes an earlier one. |
| Idempotency key | A unique id that makes a retried request safe. |
| Latency budget | The most time a step may add to a payment. |
| Fail-safe | When a part fails, the important thing (the payment) still happens. |
