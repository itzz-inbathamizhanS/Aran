# Aran Learn 3: Cryptography Basics

The cryptography Aran needs, from zero. Most important for Inbathamizhan and Aasif; everyone should read section 2.

## 1. Core ideas

Cryptography gives you three tools: encryption (lock data so only key holders read it), hashing (a fingerprint of data that cannot be reversed) and authentication (prove data came from a key holder).

| Term | Plain meaning | Everyday analogy |
| --- | --- | --- |
| Key | A secret random number, usually 128 or 256 bits | The key to a lock |
| AES | The world-standard encryption method; turns 16 bytes into 16 scrambled bytes using a key | A lock that everyone uses because it has never been picked |
| Ciphertext | The scrambled output | The locked box |
| Hash (SHA-256) | Turns any input into a fixed 32-byte fingerprint; you cannot go back | A fingerprint: identifies a person but cannot rebuild them |
| HMAC | A hash that also mixes in a secret key | A fingerprint only your team can make |
| Random token | A random string that stands in for the real value | A cloakroom ticket |

**Why HMAC and not a plain hash for Aadhaar?** There are only 8 × 10^10 possible Aadhaar numbers. An attacker can hash all of them in a few hours on a laptop and reverse any plain hash by lookup. With HMAC, the attacker also needs the key, which lives in a hardware security module and never leaves it. Aran's own-customer registry stores HMAC values for this reason.

```python
import hmac, hashlib
key = b"secret-kept-in-HSM"
tag = hmac.new(key, b"234123412346", hashlib.sha256).hexdigest()
```

## 2. Four ways to protect a value

Aran chooses one of four protections for each field and each destination. They differ in whether the real value can come back, and whether the shape is kept.

| Method | Example output for 2341 2341 2346 | Can the real value come back? | Keeps the 12-digit shape? | Use it when |
| --- | --- | --- | --- | --- |
| Masking | XXXX XXXX 2346 | No | Yes | A person only needs to recognise the number |
| Vault tokenisation | 9017 4423 8150 (random) | Yes, by asking the vault | Yes | Systems must join records but should not see the value |
| Format-preserving encryption (FF1) | 5528 0931 7704 (computed) | Yes, with the key | Yes | No vault is possible and the schema cannot change |
| Normal encryption (AES-GCM) | a long random-looking byte string | Yes, with the key | No | Storage where the shape does not matter |

**Vault tokenisation.** The vault is a guarded table: token on one side, the encrypted real value on the other. The real value never leaves the vault; everyone else stores the token. This is what UIDAI's Aadhaar Data Vault rule asks banks to do with "reference keys".

**Format-preserving encryption (FF1).** FF1 is a NIST standard that encrypts digits into digits of the same length. Inside, it is a Feistel network: split the number into a left half and a right half, then for 10 rounds mix one half using AES and add it to the other half, swapping each time. Running the rounds backwards with the same key undoes it. A "tweak" is extra public input, like the destination's name, so the same Aadhaar gives a different output for each destination. Aran's FF1 in `research/aran_core.py` matches NIST's published sample answers exactly.

```python
from aran_core import FF1
ff1 = FF1(key=bytes(16))
ct = ff1.encrypt("23412341234", tweak=b"crm")
assert ff1.decrypt(ct, tweak=b"crm") == "23412341234"
```

**One rule to remember:** never use FF1 on tiny fields such as a 4-digit last-4 or a 6-digit OTP. With so few possible values, an attacker can try them all. NIST's Rev. 1 drafts raise the minimum domain size for FF1 (one million values in the 2019 draft).

## 3. Erasure and proof

DPDP gives customers the right to have their data erased. Deleting rows does not reach logs, backups or vendor copies, so Aran erases by destroying keys instead.

**HSM (hardware security module).** A tamper-resistant device that stores keys and does encryption inside itself. Keys are never exported. Banks already use HSMs for card PINs, and UIDAI requires one for the Aadhaar Data Vault.

**Crypto-shredding.** Encrypt each customer's data with that customer's own key. To erase the customer, destroy the key. Every copy of their encrypted data, wherever it went, becomes unreadable at once. Aran goes one step further: tokens are random and the only link to the real value is the vault entry under that key, so after shredding the token says nothing at all about the customer.

**Purpose-bound keys.** The law sometimes forces a bank to keep data (KYC records, logs). Aran gives each customer one key per purpose: marketing, servicing, fraud, KYC. A marketing erasure destroys only the marketing key now; the KYC key is destroyed automatically when its legal retention period ends.

**Merkle tree (erasure receipts).** A Merkle tree hashes records in pairs, then hashes the pairs, up to one root hash. Changing any record changes the root. Aran writes every key destruction into such a log and gives the customer a short proof that their erasure entry is in it. Certificate Transparency on the web uses the same structure (RFC 6962).

```
root = H( H(H(r1) || H(r2)) || H(H(r3) || H(r4)) )
```

**Practice.**

- [ ] Compute the SHA-256 and the HMAC of the same text in Python and see that the HMAC changes when the key changes.
- [ ] Encrypt an 11-digit string with `FF1`, using two different tweaks, and confirm both decrypt back.
- [ ] Write a 10-line Merkle root function for four strings using `hashlib.sha256`.
- [ ] Explain to a teammate why deleting one customer's key erases their tokens in every log.

**Further reading.** Dan Boneh and Victor Shoup, "A Graduate Course in Applied Cryptography" (free online), chapters 1 to 4 and 8; NIST SP 800-38G for FF1; RFC 6962 sections 2.1 and 2.1.1 for Merkle proofs.
