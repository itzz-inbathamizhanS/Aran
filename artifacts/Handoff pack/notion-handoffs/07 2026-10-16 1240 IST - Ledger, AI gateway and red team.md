# 2026-10-16 1240 IST - Ledger, AI gateway and red team

Clean: Continue all remaining Aran roadmap work.

Done (on main, commit 059a2ec):
- Item 3: hard-case detector features. E9 removed 91.0% of sensitive values (was 83.5%); mobiles and OTPs 0 left.
- M4 leakage ledger (research/firewall/ledger.py): joined-system leakage 14,175 bits to 0 with fallback masks; 61 µs per decision.
- Item 6 AI gateway (research/gateway/ai_gateway.py): 7.8% of values reach the LLM provider (all names or addresses, every number 0%); 5 attack types, 0 leaks; hash-chained audit log.
- Item 9 red team: 26 tricks; fixed numbers before a full stop and a mixed-script crash.
- Speed: NER 274 to 654 lines/s.
- Learn 12 and the results report in artifacts/Ledger AI gateway and red team/.

Open issues:
- Held-out phrasings: OTP recall fell to 84.7% (missed "is the PIN to authorise txn"); mobile false alarms 17.3% on "cheque no".
- Short cue without colon ("mob 98...") still missed.
- Names remain weakest; next is transformer NER behind the gate (item 7).
