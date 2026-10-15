# Aran: AI and immune layers

This document reports the AI layer (names, addresses, OTPs and UPI IDs) and the bio-inspired immune layer (unusual data flows) added to the Aran prototype, and how both were wired into the firewall and tested on real data. Code is in [`research/`](../../research/README.md); every number below comes from [`research/results_ai.json`](../../research/results_ai.json), produced by [`research/experiment_ai.py`](../../research/experiment_ai.py).

| Part | Owner pair | Code |
| --- | --- | --- |
| NER for names and addresses (English, Hindi, Hinglish) | Bharadhwaj M, SN Arun Vijay (AI/ML) | [`ai/ner.py`](../../research/ai/ner.py) |
| OTP and UPI context classifier | Bharadhwaj M, SN Arun Vijay (AI/ML) | [`ai/context_clf.py`](../../research/ai/context_clf.py) |
| Calibrated detector | Bharadhwaj M, SN Arun Vijay (AI/ML) | [`ai/detector.py`](../../research/ai/detector.py) |
| Artificial immune system for data flows | Inbathamizhan S, Aasif Ahmed A (cyber security) | [`immune/ais.py`](../../research/immune/ais.py), [`immune/flows.py`](../../research/immune/flows.py) |
| Firewall wiring and end-to-end test | Inbathamizhan S, Aasif Ahmed A (cyber security) | [`firewall/aran_firewall.py`](../../research/firewall/aran_firewall.py) |

## 1. Data, and what is real

**Real data used**

| Dataset | What it is | Used for |
| --- | --- | --- |
| CoNLL-2003 (English) | 14,041 training and 3,453 test sentences of news, tagged person, place, organisation | NER training and test |
| HiNER (Hindi, LREC 2022) | 20,000 training and 5,000 test sentences sampled from the collapsed set | NER training and test |
| Hinglish NER tweets (code-mixed) | 3,073 tweets split 80/20 | NER training and test |
| Loghub, 16 systems | 32,000 real, unsanitised production log lines | Negatives: 8 systems for training, the other 8 only for testing |
| UCI SMS Spam Collection | 4,825 real "ham" text messages | Hard negatives for OTP and UPI |
| Loghub BGL, structured | 2,000 supercomputer log lines with 143 labelled alerts | Real-log check of the immune layer |

**Generated, never real.** No real person's identifier appears anywhere. [`synth.py`](../../research/synth.py) generates Aadhaar numbers that pass Verhoeff, card numbers that pass Luhn, PANs, mobiles, OTPs, UPI IDs and addresses, and names as random first name plus surname pairs. These are written into bank-style log lines in English, Hindi and Hinglish. Templates, names, cities and UPI handles are split into train and test halves that share nothing, so every test line uses phrasings and names the models never saw.

**Honest limit.** The same team wrote the training and test templates. Real bank logs will contain phrasings neither set covers, so the scores on generated lines are an upper bound until a bank's own (consented, masked) logs are used.

**Calibration without peeking.** Models are trained twice. A "fold" model sees only two thirds of the training phrasings and scores the remaining third, and the stacker and calibration are fitted on that third. The final model then trains on all training phrasings and reuses that calibration. This gives a calibration that reflects unseen phrasings, as at test time.

## 2. E5: Names and addresses (NER)

A linear-chain CRF with script-aware features (Latin and Devanagari in one model). It trains in about five minutes on a laptop CPU and needs no GPU, so it can run inside a bank's own data centre.

Entity-level F1 (exact span match):

| Test set | Person | Place | Organisation | Address |
| --- | --- | --- | --- | --- |
| CoNLL-2003 test (English news) | 0.85 | 0.88 | 0.74 | |
| HiNER test (Hindi) | 0.76 | 0.93 | 0.74 | |
| Hinglish tweets test | 0.69 | 0.65 | 0.63 | |
| Bank log lines, English (unseen templates and names) | 0.85 | | | 0.92 |
| Bank log lines, Hindi | 0.77 | | | 1.00 |
| Bank log lines, Hinglish | 0.83 | | | 0.88 |

Training only on the public corpora gives person F1 0.69, 0.68 and 0.59 on the bank log lines and finds no addresses at all, because news text has no postal addresses. Adding generated log lines lifts person F1 to 0.85, 0.77 and 0.83. Log text is a different domain from news, and a bank must train on its own log formats.

**On real logs:** the raw CRF tags 66 person or address spans per 1,000 lines of the 8 unseen Loghub systems, mostly dates such as "Mon Dec" read as names. The calibrated detector (E7) removes almost all of them.

## 3. E6: OTP and UPI context classifier

An OTP is a 4 to 8 digit number with no checksum, so a regex cannot tell it from a port, a latency or an order number. A UPI ID looks like `name@handle`, as do e-mail addresses and Unix `user@host` strings. The classifier reads the characters and words around each candidate (char n-grams work across English, Hindi and Hinglish without a tokenizer per language), plus a small lexicon and the published list of UPI handles.

| Test (unseen phrasings + 8 unseen real systems + real SMS) | Classifier | Prototype regex rule |
| --- | --- | --- |
| OTP: precision / recall | 1.00 / 0.80 | 1.00 / 0.61 |
| OTP: false alarms on 16,000 real log lines | 0 | 0 |
| UPI: precision / recall at p = 0.5 | 0.38 / 1.00 | 0.24 / 1.00 |
| UPI: ranking quality (AUROC) | 1.00 | |
| UPI: false alarms on 16,000 real log lines | 1,116 | 2,048 |

The UPI classifier ranks perfectly (every real UPI ID scores above every non-UPI string), but its raw 0.5 threshold is wrong for unseen systems: Thunderbird logs contain about 2,000 `local@tbird-admin1` strings, a shape the training systems never had. This is why the calibrated detector exists. In E7 the same candidates drop to 40 false alarms.

OTP recall is lowest on English lines like "OTP for txn TXN123 is 482913", where the word "txn" next to the number looks like an ordinary transaction number. Hindi and Hinglish OTP lines were all caught.

## 4. E7: Calibrated detector

Each recogniser proposes candidates with evidence: checksum result, issuer prefix, context classifier score, NER probability, nearby keywords, date words, PIN code. A per-type logistic stacker turns the evidence into a score, and isotonic regression turns the score into a calibrated probability. Aadhaar and card candidates that fail their checksum get probability 0 by design (Theorem 1 of the research document): they are Aran tokens or not identifiers.

| Type | Candidates | Real | AUROC | Precision / recall at p = 0.5 | Calibration error (ECE) |
| --- | --- | --- | --- | --- | --- |
| Aadhaar | 573 | 147 | 1.00 | 1.00 / 1.00 | 0.000 |
| Card | 5,358 | 155 | 1.00 | 0.97 / 1.00 | 0.004 |
| Mobile | 772 | 481 | 0.95 | 1.00 / 0.68 | 0.19 |
| OTP | 31,377 | 797 | 0.90 | 0.99 / 0.80 | 0.006 |
| UPI | 3,398 | 826 | 1.00 | 0.80 / 1.00 | 0.05 |
| Person | 2,694 | 1,407 | 0.95 | 0.97 / 0.87 | 0.05 |
| Address | 709 | 557 | 1.00 | 1.00 / 1.00 | 0.002 |

Overall calibration error across all 45,000 test candidates is 0.015: in the top bin, findings scored 0.99 were real 98% of the time. Mobile numbers are the weakest: a bare 10-digit number with no word like "mobile" next to it scores low, and 32% were missed.

**False alarms on 16,000 real log lines from 8 unseen systems:**

| | Card | UPI | OTP | Person | Aadhaar | Total |
| --- | --- | --- | --- | --- | --- | --- |
| Prototype regex rules | 458 | 2,048 | 0 | not detected | 0 | 2,506 |
| Calibrated detector | 2 | 40 | 5 | 13 | 0 | 60 |

## 5. E8: The immune layer ("biology plan")

**Idea.** The thymus destroys every T-cell that reacts to the body's own proteins, so the survivors attack only foreign things. Aran does the same with data flows. "Self" is every normal flow the firewall has seen: which system sends which data class to which sink, how much, at what hour, how much of it raw, how often tokens are reversed. Random detectors are generated and every detector that matches a normal flow is deleted (negative selection, V-detector variant of Ji and Dasgupta 2004). A new flow that a surviving detector covers is non-self and raises an alert. Features are relative to each source and sink pair, so 2 am is normal for the nightly data-warehouse load but not for the loan vendor.

Two more immune ideas: **memory** (a confirmed attack is cloned into memory detectors, so a repeat scores higher, like a booster response) and **tolerance** (a confirmed false alarm joins self and the detectors covering it are deleted).

**Test.** Simulated telemetry of 9 bank data flows over 30 days: 14 days to learn self, 4 days to tune the self radius (2% false-alarm budget), 12 test days with 6 attack scenarios injected. The data is simulated because no bank publishes its flow telemetry.

| Scenario | Immune layer | Isolation Forest | Static rules |
| --- | --- | --- | --- |
| A1 bulk raw export to loan vendor at night | 1/1 | 1/1 | 1/1 |
| A2 raw Aadhaar pasted into LLM prompts, normal volume | 3/3 | 0/3 | 3/3 |
| A3 debug logging leaks raw OTP/UPI for 12 hours | 12/12 | 0/12 | 12/12 |
| A4 new external sink | 1/1 | 0/1 | 1/1 |
| A5 insider mass detokenisation after hours | 2/2 | 2/2 | 0/2 |
| A6 repeat of A1 a week later | 1/1 | 1/1 | 1/1 |
| **All attack records caught** | **100%** | 20% | 90% |
| False alarms on normal records | 0.6% | 1.7% | 0% |

Static rules miss the insider (A5) because no single threshold is crossed; the immune layer catches it from the unusual combination of hour and detokenisation rate. Isolation Forest misses the subtle leaks (A2, A3) because they change one feature only.

**Memory works:** after A1 was confirmed, the score of its repeat A6 rose from 0.37 to 0.71.

**Tolerance did not help here:** marking the 2 early false alarms as self left the later false-alarm rate unchanged (0.95%), because later false alarms were different points. Tolerance only generalises to flows near the marked one.

**Sensitivity is a trade-off:** a larger self radius gives fewer false alarms but misses the subtle attacks (radius 0.05: 0.24% false alarms, 30% caught). The radius is picked on validation days, not on the test.

**Real logs (negative result).** On the labelled BGL supercomputer logs, line by line, the immune layer did worse than chance (AUROC 0.34) and a simple severity rule did best (precision 0.35, recall 1.0). 657 of the 953 normal test lines used log templates never seen in the training half, so "never seen before" did not mean "attack". Negative selection suits stable, well-sampled behaviour like recurring data flows, not raw lines of a changing system. We keep it on flows only.

## 6. E9: The wired firewall on real logs

The 16,000 real lines of the 8 unseen Loghub systems were sent through the firewall to a log-platform sink. 1,110 lines had a generated test-template line appended, carrying 1,895 sensitive values.

| | Aran firewall | Prototype regex |
| --- | --- | --- |
| Sensitive values removed | 83.5% | 46.1% |
| Aadhaar, card, PAN, UPI removed | 100% | 100% |
| Names removed | 74% | 0% |
| Addresses removed | 90% | 0% |
| OTPs removed | 79% | 57% |
| Mobiles removed | 70% | 100% |
| Clean real lines wrongly changed | 122 of 14,890 (0.8%) | 2,357 of 14,890 flagged (15.8%) |
| Tokens re-detected as real Aadhaar or card numbers | 0 | |
| Speed (one CPU core, pure Python) | 299 lines per second | |

Aadhaar and card numbers become checksum-complement tokens issued to that sink; OTPs are destroyed; names, PANs, UPI IDs, mobiles and addresses become keyed per-sink pseudonyms such as `<PER:26166cd6bc>`. Example:

```
before: ... | aadhaar_no:873002458926 pan:LEOTV8929B applicant:Suresh Gill
after:  ... | aadhaar_no:078094452267 pan:<PAN:77816c3651> applicant:<PER:219779fa46>
```

The regex rule catches every bare mobile number but at the cost of flagging any 10-digit number; the calibrated detector is stricter and misses 30% of mobiles that have no cue word. A bank that wants every mobile removed can lower the mobile threshold for its log sink.

## 7. What is still weak, and next steps

1. Mobiles without a cue word (68% recall) and English OTPs next to transaction words (80% recall). Next: train on a bank's own masked log formats.
2. Person names in English logs (87% recall). Next: a small multilingual transformer (for example IndicBERT) distilled into the CRF's speed budget.
3. Speed: 299 lines per second in pure Python. The checksum and regex stages are cheap; NER dominates. Next: run NER only on lines the cheap stages mark as free text.
4. Immune tolerance generalises poorly. Next: tolerance by affinity (delete detectors near, not only covering, a confirmed false alarm).
5. All flow attacks are simulated. Next: replay of a bank's real flow logs, if a partner bank agrees.

## Reproduce

```
cd research
./fetch_data.sh && ./fetch_ai_data.sh
pip install cryptography numpy scikit-learn sklearn-crfsuite pytest
python3 -m pytest test_core.py test_ai.py
python3 experiment_ai.py      # about 20 minutes on a laptop CPU, writes results_ai.json
```
