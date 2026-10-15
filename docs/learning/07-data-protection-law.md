# Aran Learn 7: Data-Protection Law Basics

The rules that make Aran necessary, for the whole team. This is a study guide, not legal advice.

## 1. DPDP Act 2023 and Rules 2025

The Digital Personal Data Protection Act is India's main privacy law. A bank is a Data Fiduciary under it, and its core duties apply from 13 May 2027.

| Term | Plain meaning | For a bank |
| --- | --- | --- |
| Data Principal | The person the data is about | The customer |
| Data Fiduciary | Whoever decides why and how data is processed | The bank |
| Data Processor | Whoever processes data for the fiduciary | Vendors, cloud providers, the call centre |
| Significant Data Fiduciary | A fiduciary the government names for extra duties | Large banks are likely candidates |
| Data Protection Board | The regulator that hears complaints and imposes penalties | Receives breach reports |

**Duties that Aran supports.**

- **Reasonable security safeguards (s. 8(5)):** the Rules name encryption, masking and access control. Aran's tokens and masks are exactly these. Penalty for failing: up to Rs 250 crore.
- **Breach notice (s. 8(6)):** tell the Board and affected customers. The Rules ask for a detailed report within 72 hours. Aran's leak attribution answers "what leaked, from where, when" fast. Penalty for failing: up to Rs 200 crore.
- **Erasure (s. 8(7) and s. 12):** erase data when the purpose is served or the customer asks, unless another law requires keeping it. Aran's purpose-bound key shredding does this.
- **Logs for at least 1 year (Rules):** logs must be kept, so they must be safe to keep. Aran protects data before it is written to logs.

**Key dates.** Act passed in August 2023. Rules notified 13 November 2025. Consent manager rules from 13 November 2026. Core duties from 13 May 2027.

## 2. Banking rules and how Aran meets each

Banks follow sector rules on top of DPDP. Each one below maps to a specific Aran mechanism (M1 to M5 in the research doc).

| Rule | What it says | Aran's answer |
| --- | --- | --- |
| CERT-In Directions, 28 April 2022 | Report listed cyber incidents within 6 hours; keep ICT logs for 180 days in India | Logs hold tokens, not raw IDs, so keeping them is safe; attribution speeds the 6-hour report |
| UIDAI Aadhaar Data Vault (Circular 8 of 2025, building on the 2017 rule) | Store Aadhaar only in a vault with an HSM and AES-256; business systems use reference keys | Vault-mode tokens are reference keys, and the checksum-complement form makes them provably not real Aadhaar (M1) |
| RBI payment data storage (2018) and card tokenisation rules | Payment data stored in India; merchants may not store full card numbers | Card tokens that fail Luhn (M1); per-destination tokens (M3) |
| RBI KYC Master Direction with PMLA rules | Keep KYC and transaction records for a set period after the relationship ends | Time-locked KYC keys shred automatically when retention ends (M5) |
| PCI DSS | Protect stored card numbers; first 6 and last 4 is the commonly accepted display format | The leakage ledger measures what such masks leave, and blocks combinations that leave too little (M4) |

When you cite a rule in a presentation, open the source and quote the exact clause; the research doc links each source.

## 3. Questions judges will ask

Prepare a two-sentence answer for each; the answers come from this doc and the research doc.

- [ ] Who is the Data Fiduciary and who is the Data Processor in your demo?
- [ ] How does Aran help meet the 72-hour breach report under the DPDP Rules?
- [ ] Logs must be kept for 180 days (CERT-In) and at least 1 year (DPDP Rules). How can you also honour erasure?
- [ ] Is a token still personal data? (Answer: yes while the bank can reverse it; after key shredding, Aran argues it becomes anonymous, which needs legal confirmation.)
- [ ] Why not just mask everything? (Answer: some systems must join or reverse values, and some masks leak more than they look; see Learn 4.)
- [ ] What happens when an insider who is allowed to see raw data leaks it?

**Sources.**

- [DPDP Act 2023, the Schedule of penalties](https://dpdpa.com/theschedule.html)
- [DPDP Rules 2025 summary, Khaitan & Co (15 Nov 2025)](https://www.khaitanco.com/sites/default/files/2025-11/ERGO%20-%20Digital%20Personal%20%20Data%20Protection%20Rules%20-%2015%20November%202025.pdf)
- [CERT-In Directions, 28 April 2022](https://taxguru.in/corporate-law/cert-in-issues-directions-relating-information-security-practices.html)
- [UIDAI Aadhaar Data Vault, Khaitan & Co (10 Dec 2025)](https://www.khaitanco.com/sites/default/files/2025-12/ERGO%20-%20Aadhaar%20Data%20Vault%20-%2010%20December%202025.pdf)
- [PCI SSC on 8-digit BINs](https://blog.pcisecuritystandards.org/8-digit-bins-and-pci-dss-what-you-need-to-know)
