# Aran Learn 6: Artificial Immune Systems

The biology-inspired part of Aran, for Inbathamizhan and Aasif. No biology background needed.

## 1. The biology in one page

Your body fights germs it has never seen before, without a list of every germ. It does this by learning what "self" looks like and attacking anything else. Aran copies that trick to catch data flows it has never seen before.

1. **T-cells are made with random detectors.** Each new T-cell carries a receptor of random shape, so the body produces millions of different detectors without knowing any germ in advance.
2. **The thymus deletes the dangerous ones.** Young T-cells mature in the thymus, an organ behind the breastbone. Any T-cell whose receptor binds to the body's own proteins is destroyed. This is called negative selection.
3. **Survivors only react to non-self.** Because every self-reacting detector was removed, the remaining T-cells bind only to things that are not part of the body, such as a virus.
4. **Memory.** After an infection, matching cells multiply and stay, so a second attack is caught faster.

| Biology | Aran |
| --- | --- |
| Self proteins | Normal data flows: which service sends which identifier type to which destination, how much and when |
| Random T-cell receptors | Random detector points in the space of flow features |
| Thymus deletes self-reacting cells | Detectors that match any normal flow are thrown away |
| T-cell binds a virus | A detector matches a new flow, so Aran raises an alert |
| Immune memory | Confirmed bad flows are kept as fast signatures |

The benefit: Aran does not need examples of every leak in advance. It only needs to know what normal looks like, which a bank has in abundance.

## 2. The negative selection algorithm

Forrest and colleagues turned the thymus into an algorithm in 1994 ("Self-nonself discrimination in a computer", IEEE Security and Privacy). The real-valued version used here describes each flow as a point of numbers, for example (hour of day, records per minute, identifier type, destination risk), all scaled to between 0 and 1.

1. **Collect self.** Take normal flows from a quiet period as points S.
2. **Generate candidates.** Draw random points in the same space.
3. **Censor.** Keep a candidate only if it is farther than a radius r from every self point. A detector may take the largest radius that still avoids self, which is the idea behind V-detectors (Ji and Dasgupta, 2004).
4. **Monitor.** For each new flow, if it falls inside any detector's radius, it is non-self: raise an alert.

```python
import numpy as np
rng = np.random.default_rng(0)

def train(self_pts, n_detectors=500, r_self=0.1):
    detectors = []
    while len(detectors) < n_detectors:
        c = rng.random(self_pts.shape[1])
        d = np.min(np.linalg.norm(self_pts - c, axis=1))
        if d > r_self:                     # does not touch self
            detectors.append((c, d - r_self))   # radius reaches up to self
    return detectors

def is_anomaly(x, detectors):
    return any(np.linalg.norm(x - c) < rad for c, rad in detectors)
```

**Two settings decide the trade-off.** A larger self radius r_self means fewer false alarms but more misses near the edge of normal. More detectors cover more of the non-self space but cost more memory and time; coverage can be estimated by sampling random non-self points and checking how many are caught.

## 3. How Aran uses it, and its limits

In Aran the immune layer watches the flow graph that the Record step builds (see the research doc). Each edge "service A sent N Aadhaar tokens to destination B at hour H" becomes a point. A new destination receiving card numbers at 3 a.m., or a sudden 50-fold jump in volume, lands outside self and raises an alert before a dump ever appears online.

**Real data for testing.** The public BGL supercomputer log in Loghub has real labels: lines starting with "-" are normal and the others are real alerts (about 140 of the 2,000 sample lines). It is not banking data, but it is real and labelled, so it shows honestly whether the algorithm separates normal from abnormal.

**Known limits, so you can defend the design.**

- **High dimensions:** with many features, random detectors cover the space poorly. Keep features few (under about 10) and meaningful.
- **Self changes:** a new vendor or a new product is legitimately new. Retrain self on a rolling window, and let an analyst mark a flow as "self" to teach it.
- **Not a replacement:** the immune layer finds unusual flows; the checksum and tokens prove what leaked. They complement each other.
- **Compare fairly:** report it against a simple baseline such as Isolation Forest from scikit-learn on the same data.

**Practice.**

- [ ] Run the Python sketch on 2D points: self = 200 points around (0.3, 0.3); test with points near (0.8, 0.8).
- [ ] Change r_self from 0.05 to 0.2 and count false alarms and misses.
- [ ] Turn 20 lines of a real log into feature points (hour, message length, has a number) and train on them.
- [ ] Compare your detector with `sklearn.ensemble.IsolationForest` on the same points.

**Further reading.** Forrest, Perelson, Allen and Cherukuri, "Self-nonself discrimination in a computer" (IEEE S&P 1994); Ji and Dasgupta, "Real-valued negative selection algorithm with variable-sized detectors" (GECCO 2004); Dasgupta and Niño, "Immunological Computation" (CRC Press, 2008), chapters 1 to 3; any introduction to T-cells and the thymus (Khan Academy, "Adaptive immunity").
