# Incremental README — Development Log

**Group 4:** Go, Justin · Leung, Jillianne · Luna, Jacoba · Montaño, Rovin · Teoxon, Jat  
**Machine:** Machine 4 — Decimal 32-bit Floating-Point Machine (IEEE 754 decimal32, DPD encoding)  
**Deployment Link:** *TBD*

---

## Things Done (Milestone Progress)

### July 30, 2026

- Project kickoff for CSARCH2 Simulation Project (Machine 4).
- Confirmed tech stack: Astro + Node + CSS + JavaScript.
- Chose **DPD (Densely Packed Decimal)** as the decimal32 significand encoding.
- Assigned task ownership across all five members (see Task Board below).
- Set-up Astro app foundation, shared CSS/layout, and feature pages.
- Left Feature 1–3 **logic stubs** (`src/lib/decimal32/`) with owner TODOs for members to implement.



### August 2, 2026

- Aligned feature inputs with the Machine 4 specification (decimal-only convert; decimal/binary rounding; decimal or IEEE hex arithmetic via UI format selectors).
- Added shared arithmetic operand parsing (`operands.js`).

---



## Task Board


| Member           | Ownership            | Tasks                                                                  | Status      |
| ---------------- | -------------------- | ---------------------------------------------------------------------- | ----------- |
| Montaño, Rovin   | Foundation & design  | Set-up Astro/Node; CSS/layout; shared UI; deploy config; README        | Done        |
| Go, Justin       | Feature 1            | `dpd.js`, `format.js`, `encode.js` — DPD convert; specials; binary/hex | In Progress |
| Leung, Jillianne | Feature 2            | `rounding.js` — four methods + shared `roundDigitString` API           | Done        |
| Luna, Jacoba     | Feature 3 — subtract | `subtract.js` — hex/decimal ops; steps; wire Arithmetic subtract       | Not Started |
| Teoxon, Jat      | Feature 3 — divide   | `divide.js` — division specials/steps; wire Arithmetic divide          | Not Started |


Status values: `Not Started` · `In Progress` · `Done`

---



## Machine Specification Summary

**Process:** IEEE 754 decimal single-precision (decimal32) operations.

1. **Convert** — input: decimal number → spaced binary + hex (specials).
2. **Rounding** — inputs: decimal or binary number + target digits → all four rounding methods.
3. **Arithmetic** — inputs: decimal or IEEE hex operands (format chosen in UI) + operation (sub/div) + rounding method → step-by-step + decimal / spaced binary / hex.

**decimal32 parameters used:** 32 bits · 7 significand digits · exponent bias 101 · emin −95 / emax 96 · DPD encoding.

---



## Local development

Instructions to run the web app locally:

```bash
npm install
npm run dev
npm run build
node scripts/smoke-test.mjs
```

App routes: `/` · `/convert/` · `/round/` · `/arithmetic/`  
(With GitHub Pages base path: `/CSARCH2-MACHINE-PROJECT-GROUP4/...`)

---



## Insights and Reflection



### Rovin

- **Aha moments / things learned:**
- **Challenges faced:**
- **Creative contributions:**



### Justin

- **Aha moments / things learned:**
- **Challenges faced:**
- **Creative contributions:**



### Jillianne

- **Aha moments / things learned:**
- **Challenges faced:**
- **Creative contributions:**



### Jacoba

- **Aha moments / things learned:**
- **Challenges faced:**
- **Creative contributions:**



### Jat

- **Aha moments / things learned:**
- **Challenges faced:**
- **Creative contributions:**

---



### AI Usage Disclosure

In the development of this output, Claude was used for documentation and guides for feature stubbing/to-dos. All technical claims and code for IEEE 754 decimal32 behavior are reviewed by the group against the course specification and standard references.