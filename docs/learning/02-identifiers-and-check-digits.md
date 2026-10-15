# Aran Learn 2: Indian Identifiers and Check Digits

Aran's main idea rests on one fact: Aadhaar and card numbers contain a built-in maths check. This doc teaches that check from zero.

## 1. The identifiers Aran protects

Each identifier has a fixed shape, and three of them carry a maths check. Knowing the shape is how a detector finds them; knowing the check is how it proves a match is real.

| Identifier | Issued by | Shape | Example shape | Built-in check |
| --- | --- | --- | --- | --- |
| Aadhaar | UIDAI | 12 digits, first digit 2 to 9 | 2XXX XXXX XXXX | Verhoeff (last digit) |
| Payment card number | Card networks (RuPay, Visa, Mastercard) | 13 to 19 digits; first digits name the network (RuPay 60, 65, 81, 82, 508; Visa 4; Mastercard 51 to 55) | 6XXX XXXX XXXX XXXX | Luhn (last digit) |
| PAN | Income Tax Department | 5 letters, 4 digits, 1 letter; 4th letter = holder type (P person, C company) | ABCPD1234E | A check letter, method not public |
| UPI ID | NPCI and banks | name@handle, handle from a fixed list | name@oksbi | None |
| OTP | Bank's OTP service | 4 to 8 random digits, valid for minutes | 482913 | None |
| Mobile number | Telecom operators | 10 digits, first digit 6 to 9 | 9XXXXXXXXX | None |

Never put a real person's number in code, tests or slides. Use generated numbers that pass the check, as Aran's tests do.

**Masking you see every day.** A masked Aadhaar shows only the last 4 digits (XXXX XXXX 1234). Card receipts show the first 6 and last 4. Learn 4 shows how much these masks still leak.

## 2. Check digits, step by step

A check digit is one extra digit computed from all the others. If someone mistypes one digit, the check fails. Aran uses the same check for a new purpose: telling real numbers from fake ones.

### Luhn (card numbers)

Rule: starting from the rightmost digit, double every second digit. If doubling gives more than 9, subtract 9. Add everything up. The number is valid when the total ends in 0.

Worked example with the standard test number 79927398713:

| Digit from the right | 3 | 1 | 7 | 8 | 9 | 3 | 7 | 2 | 9 | 9 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Double it? | no | yes | no | yes | no | yes | no | yes | no | yes | no |
| Value used | 3 | 2 | 7 | 16 − 9 = 7 | 9 | 6 | 7 | 4 | 9 | 18 − 9 = 9 | 7 |

Total = 3 + 2 + 7 + 7 + 9 + 6 + 7 + 4 + 9 + 9 + 7 = 70, which ends in 0, so the number is valid. Change any one digit and the total no longer ends in 0. This is modular arithmetic: we only care about the remainder after dividing by 10.

### Verhoeff (Aadhaar)

Luhn misses some mistakes, such as swapping 09 and 90. In 1969 Jacobus Verhoeff built a stronger check from a structure in group theory called the dihedral group D5: the 10 ways to rotate or flip a regular pentagon. Each of the 10 digits stands for one of those moves, and "multiplying" two digits means doing one move after the other. The order matters (rotate then flip is not the same as flip then rotate), and that is exactly why Verhoeff catches every swap of neighbouring digits.

The algorithm uses two small tables, d (combine two moves) and p (shuffle a digit according to its position). Reading right to left, keep a running value c, starting at 0:

```
c = d( c, p(i mod 8, digit_i) )      valid if c = 0 at the end
```

Worked example with the short number 2363 (tables are in `research/aran_core.py`):

| Step i | Digit | p(i mod 8, digit) | c before | c after = d(c, p) |
| --- | --- | --- | --- | --- |
| 0 | 3 | 3 | 0 | 3 |
| 1 | 6 | 3 | 3 | 1 |
| 2 | 3 | 3 | 1 | 4 |
| 3 | 2 | 1 | 4 | 0 |

The final c is 0, so 2363 is valid. A 12-digit Aadhaar works the same way with 12 steps.

**Two facts Aran relies on.**

- Both checks catch every single wrong digit. So for any 11 payload digits there is exactly one last digit that passes, and the other 9 fail.
- A random 12-digit string passes Verhoeff only 1 time in 10. That is why the checksum cut false alarms on real logs from 366 to 4.

## 3. Why this matters for Aran

Aran's tokens deliberately use a wrong check digit. Real Aadhaar numbers always pass Verhoeff, and Aran tokens never do, so any scanner can tell a protected value from a leaked one with certainty.

```python
body  = encrypt(first_11_digits)         # 11 scrambled digits
good  = verhoeff_check_digit(body)        # the one digit that would pass
token = body + str((int(good) + offset) % 10)   # offset is 1..9, never 0
# verhoeff_valid(token) is always False
```

To get the real number back, an authorised system decrypts the 11 digits and recomputes the correct check digit, so nothing is lost. Learn 3 explains the encryption step.

**Practice.**

- [ ] By hand, check whether 4111 1111 1111 1111 passes Luhn, then confirm with `luhn_valid` in Python.
- [ ] Generate 1,000 random 12-digit strings and count how many pass `verhoeff_valid`. You should get close to 100.
- [ ] Swap two neighbouring digits of a valid number and check both Luhn and Verhoeff. Find a swap that Luhn misses but Verhoeff catches (try 09 and 90).
- [ ] Read `cc_token_aadhaar` in `research/aran_core.py` and explain to a teammate why the token can never pass.

**Further reading.** "Verhoeff algorithm" and "Luhn algorithm" on Wikipedia have the full tables; for the group theory, read about the dihedral group D5 in any abstract algebra text (Gallian, Contemporary Abstract Algebra, chapter 1).
