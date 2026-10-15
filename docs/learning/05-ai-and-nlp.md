# Aran Learn 5: AI and NLP for Detection

For Bharadhwaj and Arun, who own Aran's AI part. Read Learn 1 and Learn 4 section 1 first.

## 1. Machine learning basics

Machine learning means letting a program learn a rule from labelled examples instead of writing the rule by hand. Aran uses it only where hand-written rules fail: names, addresses and the words around a number.

| Idea | Meaning | Aran example |
| --- | --- | --- |
| Labelled data | Examples with the right answer attached | Tweets where every word is tagged Person, Location, Organisation or Other |
| Feature | A measurable clue about an example | "Word starts with a capital", "previous word is Mr", "word ends in -pur" |
| Model | The learned rule that maps features to an answer | A CRF that tags each word |
| Training | Adjusting the model so its answers match the labels | `crf.fit(X_train, y_train)` |
| Test set | Examples held back and never shown during training | CoNLL-2003 test file |
| Overfitting | Memorising training examples instead of learning the pattern | 99% on training data, 60% on test data |

**The golden rule:** never measure a model on data it trained on. Split first (for example 80% train, 20% test), train on the 80%, report results only on the 20%. When examples come from templates, split by template, so the test checks whether the model generalises to wordings it has never seen.

**scikit-learn in five lines.**

```python
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=0)
model = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)
print(model.score(X_te, y_te))   # accuracy on unseen data
```

## 2. Named entity recognition (NER)

NER finds names of people, places and organisations in text. Aran needs it because names and addresses have no checksum, so only a learned model can find them in logs and chat messages.

**BIO tags.** Each word gets a tag: B (beginning of an entity), I (inside, continuing it) or O (outside).

| Word | Ramesh | Kumar | lives | in | Madurai |
| --- | --- | --- | --- | --- | --- |
| Tag | B-PER | I-PER | O | O | B-LOC |

**CRF (conditional random field).** A CRF looks at the features of each word and also at the tag of the word before it, so it learns rules such as "I-PER can only follow B-PER". It trains in minutes on a laptop CPU and is easy to explain, which is why we start with it. Library: `sklearn-crfsuite`.

**Transformers (the next step).** Models such as MuRIL and IndicBERT are pre-trained on Indian languages and usually beat a CRF by several F1 points. They need a GPU for reasonable training time, so they are the upgrade path once the CRF baseline works.

**The real datasets we will use.**

| Dataset | Language | What it is | Where |
| --- | --- | --- | --- |
| CoNLL-2003 | English | Reuters news, about 300,000 tagged words, the standard NER benchmark | GitHub mirror (synalp/NER) |
| Singh et al. 2018, Hindi-English code-mixed NER | Hinglish (Roman script) | Real tweets, about 72,000 tagged words, Person, Location, Organisation | GitHub (SilentFlame/Named-Entity-Recognition) |
| HiNER (LREC 2022) | Hindi (Devanagari) | About 100,000 sentences | Hugging Face (cfilt/HiNER-original); download it on your own laptop |

**How we measure it.** Entity-level F1 on the test set, reported separately for PER and LOC, because a model that finds names well may still miss addresses.

## 3. Text classifiers and calibration

The OTP problem: any 6-digit number looks like an OTP. A classifier reads the words around the number ("is your OTP", "do not share", "block id", "took ms") and outputs a probability that the number is a secret.

**Character n-grams.** Break the surrounding text into overlapping pieces of 2 to 5 characters ("otp", "tp ", " is"). This copes with spelling variety and Hinglish ("aapka OTP hai") without a dictionary. `TfidfVectorizer(analyzer="char_wb", ngram_range=(2,5))` builds these features, and logistic regression learns a weight for each.

**Calibration.** A model that says 0.9 should be right about 90% of the time. Raw scores often are not. Isotonic regression fixes this by learning a monotone mapping from raw score to true frequency on held-out data (`CalibratedClassifierCV` in scikit-learn). Calibrated probabilities are what let Aran combine the AI score with the checksum and registry evidence from Learn 4, because Bayes' rule needs real probabilities.

| Metric | What it tells you |
| --- | --- |
| Precision, recall, F1 | Quality of the yes or no decision (Learn 4) |
| ROC AUC | How well the scores rank real above fake, ignoring the threshold |
| Brier score | Average squared error of the probabilities; lower is better |
| Expected calibration error (ECE) | Average gap between predicted probability and actual frequency |

**Practice.**

- [ ] Install `sklearn-crfsuite` and train a CRF on the first 2,000 sentences of CoNLL-2003; report the F1 for PER.
- [ ] Add one new feature (for example "word is all capitals") and see whether F1 goes up.
- [ ] Build a tiny OTP classifier from 20 sentences you write, then test it on 5 new ones written by a teammate.
- [ ] Plot a reliability diagram (predicted probability against actual frequency) before and after calibration.

**Further reading.** Jurafsky and Martin, "Speech and Language Processing" (free online), chapters 4 (classification), 8 (sequence labelling) and 11 (transformers); the scikit-learn user guide on probability calibration; Singh et al. 2018, "Named Entity Recognition for Hindi-English Code-Mixed Social Media Text" (ACL Anthology W18-2405).
