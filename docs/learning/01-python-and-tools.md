# Aran Learn 1: Python and Tools

Read this first. It covers the tools every Aran team member uses, whatever their part.

## 1. Setup on Windows

You need three things installed: Python 3.11 or newer, git, and a code editor (VS Code is the easiest).

1. **Python:** install from python.org and tick "Add Python to PATH" during setup. Check it in a terminal with `python --version`.
2. **git:** install from git-scm.com. Check with `git --version`. Git keeps every version of the code and lets four people work on it without overwriting each other.
3. **Get the code:** `git clone https://github.com/itzz-inbathamizhanS/aran.git`, then `cd aran`.
4. **Virtual environment:** a private folder of Python libraries for this project only, so it never breaks other projects.

```
python -m venv .venv
.venv\Scripts\activate
pip install cryptography numpy scikit-learn sklearn-crfsuite pytest
```

5. **Run the research code:** `cd research`, then `bash fetch_data.sh` (use Git Bash on Windows) to download the real logs, `python -m pytest test_core.py` to run the tests, and `python experiment.py` to reproduce the results.

**Daily git routine for the team.**

| Command | What it does |
| --- | --- |
| `git pull` | Get your teammates' latest work before you start |
| `git checkout -b yourname/feature` | Make your own branch so you never break the main code |
| `git add file.py` then `git commit -m "what changed"` | Save a checkpoint with a message |
| `git push -u origin yourname/feature` | Upload your branch to GitHub |
| Open a pull request on GitHub | Ask a teammate to review before it joins the main code |

## 2. The Python you need for Aran

Aran's code uses five Python ideas again and again. Learn these and you can read every file in `research/`.

**Strings and loops over digits.** An Aadhaar number is handled as text, and each character is turned into a number.

```python
aadhaar = "234123412346"
digits = [int(ch) for ch in aadhaar]   # [2, 3, 4, 1, ...]
last4 = aadhaar[-4:]                   # "2346"
masked = "XXXX XXXX " + last4          # "XXXX XXXX 2346"
```

**Regular expressions (regex).** A regex is a search pattern. `\d` means one digit, `{4}` means exactly four times, `[2-9]` means any digit from 2 to 9.

```python
import re
AADHAAR = re.compile(r"[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}")
line = "user kyc ok uid=2341 2341 2346 status=200"
print(AADHAAR.findall(line))   # ['2341 2341 2346']
```

A regex only checks the shape. That is why it also matches fan speeds and block IDs in real logs, and why Aran adds the checksum test (see Learn 2).

**Functions.** Every check in Aran is a small function that takes text and returns True or False.

```python
from aran_core import verhoeff_valid
print(verhoeff_valid("2363"))   # True: the last digit 3 is the correct check digit
```

**Dictionaries for counting.** The experiment counts hits per detector with a dict.

```python
counts = {"regex": 0, "checksum": 0}
counts["regex"] += 1
```

**Tests.** A test is a function starting with `test_` that uses `assert`. If an assert is false, pytest reports a failure. Aran's `test_core.py` checks the encryption against NIST's official sample answers, so we know it is correct.

```python
def test_luhn():
    assert luhn_valid("4111111111111111")   # a standard test card number
```

**Files in the repo and what each does.**

| File | Purpose |
| --- | --- |
| `research/aran_core.py` | Verhoeff, Luhn, FF1 encryption, tokens, leakage counting |
| `research/test_core.py` | Tests that prove the core is correct |
| `research/experiment.py` | Runs the four experiments on real logs |
| `research/results.json` | The numbers the experiments produced |
| `research/fetch_data.sh` | Downloads the real public logs |

## 3. Practice and further learning

Do these five tasks in order; each takes under an hour and uses only the repo.

- [ ] Clone the repo, create the virtual environment, and run `python -m pytest test_core.py` until all tests pass.
- [ ] Write a regex that finds Indian mobile numbers (10 digits starting with 6 to 9) and test it on three lines you write yourself.
- [ ] Write a function `mask_mobile(s)` that returns `"XXXXXX" + s[-4:]`, plus a test for it.
- [ ] Run `python experiment.py` and find the number 67481 in `results.json`. Explain to a teammate what it means.
- [ ] Make your own git branch, commit your function and test, push it, and open a pull request.

**Where to learn more (free).**

- Python basics: the official tutorial at docs.python.org/3/tutorial, chapters 3 to 5.
- Regex practice: regex101.com (choose the Python flavour; it explains every part of a pattern).
- Git: the free book "Pro Git" at git-scm.com/book, chapters 1 to 3.
- Testing: docs.pytest.org, the "Get Started" page.

**Reading order for the other learning docs:** Learn 2 (identifiers and check digits), Learn 3 (cryptography), Learn 4 (probability), then Learn 5 (AI and NLP) for Bharadhwaj and Arun, or Learn 6 (immune systems) for Inbathamizhan and Aasif, and Learn 7 (law) for everyone.
