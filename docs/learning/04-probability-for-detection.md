# Aran Learn 4: Probability for Detection

The maths behind Aran's detector and leakage ledger, with school-level algebra only. Everyone should read section 1.

## 1. False alarms and Bayes' rule

Every detector makes two kinds of mistakes, and Aran's whole detector is about trading them off with numbers instead of guesses.

| Term | Meaning | Aran example |
| --- | --- | --- |
| True positive | A real Aadhaar, flagged | Good |
| False positive (false alarm) | Not an Aadhaar, flagged anyway | An HDFS block ID that looks like a card number |
| False negative (miss) | A real Aadhaar, not flagged | A leak that gets through |
| Precision | Of everything flagged, the share that is real | Low precision means analysts ignore alerts |
| Recall | Of everything real, the share flagged | Low recall means leaks get through |
| F1 score | One number combining both: 2 × P × R / (P + R) | Used to compare NER models in Learn 5 |

**Bayes' rule in odds form.** Start with a prior belief, then multiply by how much more likely the evidence is if the value is real than if it is noise. That multiplier is the likelihood ratio.

```
posterior odds = prior odds × Λ1 × Λ2 × ...,   Λ = P(evidence | real) / P(evidence | noise)
```

**Worked example.** Suppose 1 in 1,000 twelve-digit strings in a bank log is a real Aadhaar (an assumed number for teaching).

1. Prior odds = 1 : 999, so about 0.1%.
2. It passes Verhoeff. A real Aadhaar always passes; a random string passes 1 time in 10. So the ratio is 1 / 0.1 = 10. Odds become 10 : 999, about 1%.
3. It is found in the bank's own-customer registry, whose false-positive rate is 1 in a million. The ratio is about 1,000,000. Odds become about 10,000 : 1, so 99.99%.

The checksum alone is not enough proof; the registry turns a hint into near-certainty. The Neyman-Pearson lemma says that putting a threshold on this ratio is the best possible test for any false-alarm rate you choose.

## 2. Filters and collisions

**Bloom filter.** A compact way to ask "have I seen this before?" without storing the items. It is a long row of m bits, all 0 at first. To add an item, hash it k different ways and set those k bits to 1. To check an item, look at its k bits: if any is 0, it is definitely new; if all are 1, it is probably known. The "probably" has a precise error rate for n items:

```
error ≈ (1 − e^(−k·n/m))^k
```

For 100 million identifiers and an error rate of one in a million, you need about 2.9 billion bits (about 360 MB) and k = 20 hash functions. A Bloom filter cannot delete items, which DPDP erasure needs, so Aran uses a cuckoo filter, which stores small fingerprints that can be removed.

**Collisions and the birthday bound.** In a room of 23 people, two share a birthday more than half the time, even though there are 365 days. The general rule: with N random values drawn from D possibilities, the chance that some two collide is about N² / (2D). This is why Aran never makes tokens by truncating a hash: 50 million customers in 10^11 possible tokens would give about 12,500 collisions. FF1 and the vault both guarantee no collisions.

**Leak attribution uses the same maths.** A leaked token could wrongly match another destination's token with probability at most (S − 1) × N / D. With 40 destinations, 50 million customers and D = 10^11 that is about 2% for one token, but under 3 in a billion for a dump of 5 tokens, because each extra token multiplies the chance down.

## 3. Measuring leakage in bits

A mask is safe only if it leaves many possible answers. Min-entropy counts them in bits: H = log2(number of values still possible). Each bit doubles the attacker's work.

```
H(X | view) = log2 |{ x : x is consistent with the view }|
```

**Worked example.** A 16-digit card shown as first 8 and last 4 hides 4 digits, so 10^4 = 10,000 options. But the Luhn check fixes the total, so only 1 in 10 of those pass: 1,000 options, which is log2(1000) ≈ 10 bits. A script can try 1,000 numbers in under a second. Aran's code counts these exactly using dynamic programming over the checksum (the function `count_luhn_completions`).

**The ledger.** One destination seeing the first 8 digits and another seeing the last 4 is fine alone, but if they can combine data, the pair leaves only 1,000 options. Aran adds up what each group of destinations has seen and blocks a new flow that would drop any customer's secret below a threshold, such as 20 bits.

**Practice.**

- [ ] Compute log2 of 8,000,000 (the options left by a masked Aadhaar showing the last 4). Compare with the 22.9 bits in the research doc.
- [ ] Use the Bloom formula to find the error rate for n = 1,000, m = 10,000 and k = 7.
- [ ] Simulate the birthday problem in Python: draw 23 random days 10,000 times and count how often two match.
- [ ] Change the worked Bayes example so the prior is 1 in 100. What is the final probability?

**Further reading.** Khan Academy's free probability unit (conditional probability and Bayes); Mitzenmacher and Upfal, "Probability and Computing", chapter 5 for Bloom filters and the birthday problem; Geoffrey Smith, "On the Foundations of Quantitative Information Flow" (2009) for min-entropy.
