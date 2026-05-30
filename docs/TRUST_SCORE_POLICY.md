# Bharosa Trust Score — Scoring Policy

**Version 1.0 · Scale: 0–1000**

This document explains, in plain language, exactly how a merchant's Bharosa
Trust Score is calculated. It is the single source of truth for the scoring
logic and is meant to be readable by merchants, lenders, and auditors alike.

---

## 1. What the score means

The Trust Score is a number from **0 to 1000** that estimates how likely a
merchant is to repay credit on time.

| Score | Meaning |
|-------|---------|
| **0–449** | Building — little or no evidence yet |
| **450–649** | Starter — early positive signals |
| **650–799** | Growth — consistent, anchor-traceable trust |
| **800–1000** | Established — strong, well-evidenced track record |

The score is always shown together with a **confidence %**. A high score with
low confidence means "looks good, but we don't have much evidence yet."

---

## 2. The core model (one idea)

We model the merchant's probability of repayment, `p`, as a **Beta(α, β)**
belief — the standard Bayesian model for "how often does a yes/no event succeed."

- **α** behaves like a running count of *positive* evidence.
- **β** behaves like a running count of *negative* evidence.
- Every merchant starts from a neutral **prior** of `α = 2, β = 3`
  (a cautious starting belief, mean = 0.40 → a starting score of **400**).

As real evidence arrives, we add to α and β. The belief sharpens and the score
moves.

### From belief → the three numbers you see

Given the current `α` and `β`:

```
mean  = α / (α + β)                      # the expected repayment probability
score = round(mean × 1000)               # 0..1000   ← the headline number
p5    = 5th-percentile of Beta(α, β)     # conservative "bad day" estimate
p95   = 95th-percentile of Beta(α, β)    # optimistic "good day" estimate
confidence   = round((1 − (p95 − p5)) × 100)   # narrower band = higher confidence
recommended_loan = floor(200,000 × p5)   # NPR, sized off the conservative p5
```

> **Why a band, not just a point?** Two merchants can both score 700, but one
> with 3 records and one with 30. The 30-record merchant has a *narrower* band
> (higher confidence) and qualifies for a larger loan, because the loan is sized
> off the conservative lower bound `p5`, not the headline score.

---

## 3. What counts as evidence

Every signal is converted into a standard **Evidence** unit with three fields:

| Field | Range | Meaning |
|-------|-------|---------|
| `value` | −1.0 … +1.0 | direction & strength (+ = creditworthy, − = risk) |
| `reliability` | 0.0 … 1.0 | how much we trust the source of this signal |
| `k` | ≥ 0 | pseudo-count — how many "observations" this is worth |

Each piece of evidence updates the belief like this:

```
if value > 0:  α += reliability × k × value      # pushes the score up
if value < 0:  β += reliability × k × |value|     # pushes the score down
```

So a **reliable, strong, frequently-observed** positive signal moves the score
the most; a weak or low-reliability signal barely nudges it. Missing data simply
adds nothing — the merchant stays near the prior with a wide (low-confidence)
band. **Nobody is penalised for being new; they are just less certain.**

### The three evidence sources

1. **Behaviour** (`behavior_engine`) — on-time bill and repayment history
   (e.g. "11/12 electricity bills paid on time"). Direct, high-reliability
   financial behaviour.

2. **Social graph** (`graph_engine`) — vouches and guarantees from other
   merchants. Trust **flows from verified anchors** via personalized PageRank,
   so a vouch from a highly-trusted merchant is worth more than one from an
   unknown account. A guarantee counts double a plain vouch. See fraud handling
   below.

3. **Psychometric interview** (`interview` / voice intake) — short spoken
   answers scored for credit-relevant traits. Lower reliability than hard
   financial data, so it informs but never dominates the score.

---

## 4. Fraud protection (anti-gaming)

The social graph is the easiest thing to fake, so it is explicitly defended:

- **Anchor-traceable only.** Vouch weight comes from personalized PageRank
  seeded on verified anchors. Trust that can't be traced back to an anchor
  carries almost no weight.
- **Fraud-ring detection.** Communities that are internally dense or
  reciprocal (A↔B "you vouch for me, I vouch for you") **with near-zero anchor
  inflow** are flagged. All vouches inside a flagged ring are **discounted to
  ~0** (`reliability = 0, k = 0`), and the merchant is marked `fraud_risk: HIGH`.

This means colluding to inflate each other's scores does not work.

---

## 5. The path to a higher score (counterfactual)

The score is never a dead end. For any merchant below the top tier, we compute
the **minimum extra positive evidence** needed to reach the next tier — by
literally inverting the scoring formula — and translate it into concrete actions:

- Tier thresholds (on the mean): **starter 0.45**, **growth 0.65**,
  **established 0.80** (i.e. scores of 450 / 650 / 800).
- Example output: *"≈ 2 more on-time bills, OR 1 vouch from a trusted merchant."*

So every merchant can see exactly what to do next.

---

## 6. Properties we guarantee

- **Deterministic & reproducible.** The same evidence always yields the same
  score. There is no random component.
- **Monotonic.** Positive evidence can only raise the score; negative evidence
  can only lower it.
- **Bounded.** The score is always within 0–1000; the loan within 0–NPR 200,000.
- **Explainable.** Every score ships with its evidence list and a plain-language
  reason. Nothing is a black box.
- **Privacy-respecting.** KYC documents and selfies are stored privately and are
  owner-scoped; they are used for identity verification, not sold or exposed.

---

## 7. Where this lives in the code

| Concept | File |
|---------|------|
| Belief update, score/confidence/loan | `server/app/engines/fusion_engine.py` |
| Social graph & fraud rings | `server/app/engines/graph_engine.py` |
| Behaviour signals | `server/app/engines/behavior_engine.py` |
| Next-tier path & explanation | `server/app/engines/explainer.py` |
| Passport assembly | `server/app/services/passport_service.py` |

The display scale (0–1000) is set by `SCORE_MAX` in `fusion_engine.py`.

---

*This policy describes plausibility scoring for thin-file merchants. It is a
decision-support tool, not an authoritative government credit bureau rating.*
