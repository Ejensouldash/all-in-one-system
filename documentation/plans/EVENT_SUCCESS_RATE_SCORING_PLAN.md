# Weighted Event Success Rate — Implementation Notes

**Feature:** Post-Event Report Hub → tab **4. Impact & Review** → section **14**
**Status:** Implemented (6 November 2026)
**Scope:** `/marketing/events` → Post-Event Report modal, ISO PDF report

---

## 1. Summary

`Event Success Rate (%)` used to be a manual number input (default `99`) with no link to event
data. It is now a **weighted 100-point score** calculated on the server from four components:

| # | Component | Data source | Weight |
|---|---|---|---|
| A | Public Feedback Satisfaction | `MarketingEventFeedback.satisfaction` | **50%** |
| B | Expected Impact & Stock Distribution | Structured item list: quantity given vs quantity used | **20%** |
| C | Budget Compliance (Finance & Claims) | Approved budget cap vs `totalClaimAmount` | **15%** |
| D | Participants' Feedback Sentiment | Each response's `likedLeast` + `comments`, classified by Gemini | **15%** |

The report stores a **snapshot** (`scoreBreakdown`) that is frozen when the report is submitted.
The client previews the same formulas live, but the server is authoritative.

---

## 2. Scoring Formulas

```
TOTAL = A + B + C + D        (maximum 100 points)
```

All components are rounded to 2 decimal places when stored. The UI shows 1 decimal place; the
PDF shows 1 decimal place as well.

### A. Public Feedback Satisfaction — 50 points

Uses the same satisfaction index as the events dashboard (single source of truth):

```
SATISFACTION_WEIGHTS = {
  EXTREMELY_SATISFIED: 100,
  VERY_SATISFIED: 80,
  SOMEWHAT_SATISFIED: 60,
  NOT_SO_SATISFIED: 40,
  NOT_AT_ALL_SATISFIED: 20,
}

satisfactionIndex = SUM(weight) / responseCount       // 0–100
A = (satisfactionIndex / 100) × 50
```

Example: 4 extremely, 3 very, 2 somewhat, 1 not so → (400 + 240 + 120 + 40) / 10 = **80**
→ A = **40.00 / 50**

The positive rate `(extremely + very) / total` is still displayed as supporting information.

### B. Expected Impact & Stock Distribution — 20 points

Section 7 now stores a structured list instead of a free-text field:

| Item | Unit | Qty Given | Qty Used | Achievement |
|---|---|---|---|---|
| Bubbles O2 425ml × 24 | ctn | 1000 | 850 | 85.0% |
| Bubbles O2 800ml × 12 | ctn | 50 | 50 | 100.0% |

```
achievement = MIN(1, totalUsed / totalGiven)
B = achievement × 20
```

Example: (850 + 50) / (1000 + 50) = **85.71%** → B = **17.14 / 20**

Rules:
- Over-consumption (`qtyUsed > qtyGiven`) is capped at 100% per row, highlighted in red, and
  flagged `OVER_CONSUMPTION`.
- If all rows use different units, the engine averages the per-row achievement and raises
  `MIXED_UNITS`.
- No rows with `qtyGiven > 0` → B = 0 and flag `NO_IMPACT_DATA`.
- The legacy free-text field is kept as optional "Distribution notes".

### C. Budget Compliance — 15 points

Finance sets a maximum approved budget (`budgetCap`) in the Finance tab.

```
if cap is empty/zero        → C = 0, flag NO_BUDGET_CAP
if claims <= cap            → C = 15
if claims > cap             → C = 15 × MAX(0, (2 × cap − claims) / cap)
```

The penalty is linear: full marks up to the cap, zero once claims reach **twice** the cap.

Example: claims RM1,950, cap RM1,500 → 15 × (3000 − 1950) / 1500 = **10.50 / 15**

| Claims vs RM1,500 cap | Points |
|---|---|
| RM1,400 | 15.00 |
| RM1,500 | 15.00 |
| RM1,650 | 12.75 |
| RM1,950 | 10.50 |
| RM3,000 | 0.00 |
| RM4,000 | 0.00 |

### D. Participants' Feedback Sentiment — 15 points

Every feedback response is classified by Gemini as `GOOD`, `NEUTRAL`, or `BAD`:

```
GOOD = 1.0, NEUTRAL = 0.5, BAD = 0
suggestionIndex = SUM(points) / analysedCount      // 0–1
D = suggestionIndex × 15
```

Example: 6 GOOD, 3 NEUTRAL, 1 BAD → (6 + 1.5 + 0) / 10 = **75%** → D = **11.25 / 15**

Rubric used by the model:
- **GOOD** — concrete, actionable suggestion, or specific praise with reasoning.
- **NEUTRAL** — generic, mixed, vague, or no clear direction.
- **BAD** — complaint without a constructive suggestion, sarcasm, blame, or purely negative.

Input text is treated strictly as data (prompt-injection resistant). Respondent names are never
sent to Gemini.

### Full example

A 40.00 + B 17.14 + C 10.50 + D 11.25 = **78.89 → displayed as 78.9% (PDF 78.9%)**

---

## 3. Data Model

### `MarketingEventRequisition`
| Field | Type | Purpose |
|---|---|---|
| `budgetCap` | `Float?` | Maximum approved budget (Finance) |
| `budgetSetBy` | `String?` | Audit — who set the cap |
| `budgetSetAt` | `DateTime?` | Audit — when the cap was set |

### `MarketingEventFeedback`
| Field | Type | Purpose |
|---|---|---|
| `aiSentiment` | `String?` | `GOOD` / `NEUTRAL` / `BAD` |
| `aiConfidence` | `Float?` | Model confidence (0–1) |
| `aiReason` | `String?` | Short model justification |
| `aiModel` | `String?` | Model used (audit) |
| `aiTextHash` | `String?` | SHA-256 cache key of `likedLeast + comments` |
| `aiAnalyzedAt` | `DateTime?` | Last analysis timestamp |

### `MarketingPostEventReport`
| Field | Type | Purpose |
|---|---|---|
| `impactDistribution` | `String @default("[]")` | JSON: `[{ id, name, unit, qtyGiven, qtyUsed }]` |
| `eventSuccessRate` | `Float @default(0)` | Cached total (was `Int`, default 99) |
| `scoreBreakdown` | `String @default("{}")` | Full JSON snapshot (see below) |
| `scoreComputedAt` | `DateTime?` | Snapshot timestamp |
| `scoreFlags` | `String @default("[]")` | JSON `ScoreFlag[]` |

### `scoreBreakdown` shape

```json
{
  "version": 1,
  "components": {
    "satisfaction": { "earned": 40, "max": 50, "index": 80, "positiveRate": 70, "responses": 10 },
    "impact": { "earned": 17.14, "max": 20, "given": 1050, "used": 900, "achievement": 85.71 },
    "budget": { "earned": 10.5, "max": 15, "cap": 1500, "claims": 1950, "ratio": 1.3 },
    "suggestion": { "earned": 11.25, "max": 15, "index": 75, "good": 6, "neutral": 3, "bad": 1, "analyzed": 10, "responses": 10 }
  },
  "total": 78.89,
  "computedAt": "2026-11-06T07:00:00.000Z",
  "flags": []
}
```

### Migration

`prisma/marketing_event_success_rate_migration.sql` is idempotent and was applied to the
configured database. It adds nullable columns, widens `eventSuccessRate` from `INTEGER` to
`DOUBLE PRECISION` (safe, existing values preserved), and changes its default from `99` to `0`.

---

## 4. Score Flags and Submission Rules

| Flag | Meaning | Blocks submission |
|---|---|---|
| `NO_FEEDBACK` | No public feedback responses | Yes |
| `NO_IMPACT_DATA` | No stock items with quantity given | Yes |
| `NO_BUDGET_CAP` | Finance has not set the budget cap | Yes |
| `AI_PENDING` | No response analysed by Gemini | Yes |
| `AI_PARTIAL` | Some responses not analysed | Yes |
| `OVER_BUDGET` | Claims exceed the cap | No |
| `OVER_CONSUMPTION` | Stock used exceeds stock given | No |
| `MIXED_UNITS` | Items use different units | No |

`submitPostEventReport` recomputes the score, refuses submission while any blocking flag exists,
and on success freezes `scoreBreakdown`, `scoreComputedAt`, and `scoreFlags` on the report.
`savePostEventReport` refuses to modify a locked score. The only exception is
`setEventBudgetCap`, which budget-permission holders can use to revise the cap on a locked report:
the snapshot is recalculated and the revision is written to the audit log. The Approval tab shows
a live completeness checklist.

---

## 4.1 Budget Cap Permission (Module Access)

The budget cap is protected by its own module permission, separate from event editing:

| Item | Value |
|---|---|
| Module ID | `MARKETING_EVENTS_BUDGET` |
| Label in User Access | **Post-Event Budget Cap (Finance)** |
| Granted by | Superadmin only, via `/users/[id]/access` (the page already redirects non-superadmins) |
| Helper | `canSetMarketingEventBudget()` in `src/lib/access.ts` (superadmins always pass) |

Behaviour:
- The events page passes `canSetBudget` to the report modal; the budget input and Save button are
  disabled with an explanatory message for everyone else.
- The permission grants **no** approval, rejection, or requisition-edit rights. The user still needs
  `MARKETING_EVENTS` to open the events page, as stated in the module description.
- Budget holders may also revise the cap after the report is `SUBMITTED` or `APPROVED`. A
  confirmation is required, the success-rate snapshot is recalculated, and the audit log records
  that the report was already locked.
- `setEventBudgetCap` enforces the same rule on the server, so disabling the UI is not the only
  protection.

---

## 5. Architecture & Files

| File | Role |
|---|---|
| `src/lib/marketing/event-success-rate.ts` | Pure engine: weights, sanitisation, component formulas, flags, parsing, submission requirements |
| `src/lib/marketing/event-success-rate-server.ts` | `recomputeEventScore()` — recomputes from DB and persists unless locked |
| `src/lib/marketing/feedback-sentiment.ts` | Gemini batch classifier, prompt, hashing, batching |
| `src/app/actions/marketing-feedback-ai.ts` | Server action `runFeedbackSentimentAnalysis()` (audited, cached, batched) |
| `src/app/actions/marketing-post-event-report.ts` | Server-authoritative scoring on read/save/submit, plus `setEventBudgetCap()` |
| `src/components/marketing/EventSuccessScoreCard.tsx` | Reusable 4-bar score card |
| `src/components/marketing/PostEventReportModal.tsx` | Impact table, budget panel, live score preview, Gemini panel, checklist |
| `src/lib/marketing-post-event-pdf.ts` | Builds PDF data with impact items and the score snapshot |
| `src/lib/pdf/PostEventIsoReportDocument.tsx` | Renders impact table and score breakdown in the PDF |
| `src/app/actions/marketing-feedback.ts` | Now imports the shared `SATISFACTION_WEIGHTS` |

### Server authority

- `getPostEventReport` returns the live breakdown for drafts and the frozen snapshot for
  submitted/approved reports.
- `savePostEventReport` ignores the client's `eventSuccessRate` and recalculates from the
  sanitised claims, feedback rows, budget cap, and impact items.
- Score fields are only updated when the report is a draft.

---

## 6. Gemini Integration

- Model: `GEMINI_MODEL` (`gemini-3.1-flash-lite`) via `src/lib/ai/gemini.ts`.
- `generateGeminiJson` provides JSON parsing and retry handling (429/5xx/timeouts).
- Temperature `0.1`, `responseMimeType: application/json`.
- Batches of **20 responses per request**, processed sequentially.
- Only responses with a new text hash are analysed (cost control); a re-analysis can be forced.
- If the API key is missing or the model fails, the UI shows the error and leaves the responses
  pending — it never silently records a 0.
- Confidence and a short English reason are stored per response for audit.

---

## 7. UI Changes

**Section 7 — Objectives**
- Structured item table (Item, Unit, Qty Given, Qty Used, Achieved %) with add/remove.
- Live totals and the component score (e.g. `17.14 / 20 pts`).
- Optional distribution notes (legacy free text, not scored).

**Section 10 — Finance**
- Budget cap panel with RM input, Save action, audit line ("Set by … on …"), and a progress bar
  showing claimed vs cap, over-budget amount, and the 15-point component.
- Input and Save are enabled only for superadmins and users granted the **Post-Event Budget Cap
  (Finance)** module; other users see an explanatory message.
- Authorised budget users can still revise the cap on a locked report (confirmation + recalculation
  + audit trail).

**Section 11 — Public Feedback**
- Satisfaction index (0–100) instead of the old misleading `99%` fallback.
- "50% of success rate" note.

**Section 12 — Participants' Feedback**
- Gemini panel listing each response with GOOD / NEUTRAL / BAD chips, AI reason, analysis counts,
  and an "Analyse with Gemini" / "Re-analyse" button.
- The existing free-text summary fields remain editable by staff.

**Section 14 — Event Success Rate**
- Manual input replaced by the score card: total, four component bars, earned/max points, detail
  lines, and warning chips.

**Approval tab**
- Score card plus a completeness checklist; submission is blocked with a clear message.

**Header/footer**
- Live success-rate chip in the header and footer.

---

## 8. Edge Cases

| Case | Behaviour |
|---|---|
| Zero feedback responses | A and D = 0, flag `NO_FEEDBACK`; maximum score 50 until responses arrive |
| No stock items | B = 0, flag `NO_IMPACT_DATA` |
| No budget cap | C = 0, flag `NO_BUDGET_CAP`, submission blocked |
| Zero claims with a cap | C = 15 (within budget) |
| Claims at exactly the cap | C = 15 |
| Claims at 2× the cap or above | C = 0 |
| `qtyUsed > qtyGiven` | Row capped at 100%, red highlight, warning flag |
| Mixed units | Warning flag; per-item average used |
| Gemini unavailable | Responses stay pending; component stays 0 with `AI_PENDING`; no silent zero |
| New feedback after submission | Snapshot stays frozen; report shows the locked score |
| Legacy reports | Existing `eventSuccessRate` values remain until the report is opened or saved again |

---

## 9. Verification Performed

- `npx prisma generate` — schema valid.
- Migration executed successfully against the configured database; new columns queryable.
- `npx tsc --noEmit` — no type errors.
- ESLint on new modules and actions — clean.
- Engine unit checks (compiled standalone):
  - satisfaction 40.00 / 50 for the sample distribution;
  - impact 17.14 / 20;
  - budget 10.50 / 15 at RM1,950 vs RM1,500, 15 at RM1,400, 0 at RM3,000;
  - suggestion 12.75 / 15 for 7 GOOD + 3 NEUTRAL;
  - total 80.39 with `OVER_BUDGET` flag;
  - missing-data flags correct.
- `npm run build` — production build completed successfully (exit code 0).

---

## 10. Deployment Notes

1. `prisma generate` runs automatically on install/build.
2. Apply `prisma/marketing_event_success_rate_migration.sql` to every environment database
   (idempotent).
3. Ensure `GEMINI_API_KEY` is set; otherwise sections A–C still score and D stays pending.
4. Superadmin must grant **Post-Event Budget Cap (Finance)** to the users who maintain event
   budgets. Those users also need **Marketing Events Management** to open the events page.
5. Existing reports will show the new score after they are opened and saved; submitting requires
   all four components to be complete.

---

## 11. Possible Follow-ups

- Prefill impact items from `MarketingStockLog` once stock movements can be linked to an event.
- Optional HOD override with a mandatory reason and audit trail.
- Show the score as a badge in the events list (requires including the report in the list query).
- Backfill script to recompute historical reports in bulk.
