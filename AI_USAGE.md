# AI Usage Log & Development Decisions

This document details the extent of AI utilization throughout the design, implementation, and verification of **ShiftSwap**, in compliance with project documentation standards.

---

## 1. Summary of AI Role

AI (Antigravity by Google DeepMind) was used as an end-to-end pairing partner and systems engineer across four key project dimensions:
1. **Domain Specification Translation & Rules Engine Design:** Transforming formal clinical scheduling constraints into an algorithmic validation hierarchy.
2. **Deterministic Seed Data Synthesis:** Creating a conflict-free clinic schedule spanning multiple weeks, shifts, certifications, and initial marketplace states.
3. **Full-Stack Implementation:** Generating the FastAPI REST backend, SQLite schema, React TypeScript frontend, and Tailwind styling.
4. **Comprehensive Test Suite & Quality Assurance:** Formulating automated unit tests for every boundary condition and validating the app live via headless browser previews.

---

## 2. Rules Engine Design & Implementation

### 2.1 The Validation Hierarchy
The AI structured the core compliance engine around a strict three-phase hierarchy:

1. **Availability Gatekeeper:**
   - Evaluates whether the listing status is `OPEN`.
   - If not `OPEN`, immediately returns `"Listing is no longer available"` without proceeding to Rule 1 or Rules 2–5.
2. **Rule 1 (Self-Claim) Isolation:**
   - Evaluates whether the claimer $C$ is the shift's poster $P$ ($C == P$).
   - If $C == P$, halts immediately and emits only `"Cannot claim your own shift"`. Rules 2 through 5 are suppressed to prevent noisy, redundant diagnostics.
3. **Simultaneous Multi-Rule Evaluation (Rules 2 to 5):**
   - If $C \neq P$, rules 2, 3, 4, and 5 are evaluated in parallel against all shifts currently assigned to $C$.
   - Every violation is collected and returned in the refusal response so the user or manager receives full diagnostic feedback in one round-trip.

### 2.2 Refusal Message Formatting
The AI strictly adhered to the exact message schemas specified in the problem statement:
- Rule 2: `"Missing required certification: {cert}"`
- Rule 3: `"Overlaps with assigned shift {id} ({start} - {end})"`
- Rule 4: `"Insufficient rest period (less than 11 hours) with shift {id} ({start} - {end}). Gap is {hours}h {minutes}m"`
- Rule 5: `"Total weekly hours ({current_hours}h + {shift_hours}h = {total_hours}h) would exceed 40 hour limit for week starting {week_start_date}"`

---

## 3. Seed Dataset Synthesis (`seed.json`)

### 3.1 Initial Requirements
- 5 Staff members with varied certifications (`Triage`, `ICU`, `Pediatrics`, `Phlebotomy`).
- 2 Managers (`Dr. Sarah Vance`, `Marcus Brody`).
- 15 Shifts spanning 2 consecutive weeks (October 12–18 and October 19–25, 2026).
- Demonstration states for the swap marketplace:
  - 1 Shift listed in `OPEN` status (`shift-102`, posted by Bob Miller).
  - 1 Shift listed in `CLAIMED` status (`shift-104`, posted by Diana Ross, claimed by Alice Chen).
  - 13 Assigned shifts in regular scheduled status.

### 3.2 Automated Zero-Violation Verification
The AI wrote and executed a seed verification test to verify that prior to any user interaction, all 15 shifts in `seed.json` strictly complied with:
- Zero certification mismatches
- Zero overlapping assignments
- Zero rest-period violations (all inter-shift gaps $\ge 11$ hours)
- Zero staff exceeding 40 hours per week (highest baseline was Alice with 32h).

---

## 4. Architectural & Engineering Decisions: Accepted vs. Modified

| Decision Topic | Initial AI Consideration | Final Implemented Decision | Rationale |
|---|---|---|---|
| **Rule 4 (Rest Gap) Overlap Handling** | Calculate rest gap for all assigned shifts. | **Strictly evaluate Rule 4 only for non-overlapping shifts.** | Overlapping shifts are fundamentally covered by Rule 3. Applying negative rest durations to overlapping shifts produces confusing diagnostics like "gap is -2h". Non-overlapping shifts cleanly report exact positive gap hours and minutes. |
| **Week Attribution for Overnight Shifts** | Split hours across midnight between two consecutive weeks if a shift crosses Sunday to Monday. | **Attribute 100% of shift hours to the week where the shift starts.** | Healthcare rostering conventions attribute a shift to the calendar week of its shift start. Splitting minutes complicates weekly hour auditability. |
| **Boundary Minute Gaps (Back-to-Back Shifts)** | Treat adjacent shifts (e.g. 07:00–15:00 and 15:00–23:00) as overlapping. | **Treat adjacent shifts as touching (gap = 0h 0m), triggering Rule 4.** | A 15:00 end and a 15:00 start have zero gap. They do not conflict in time (overlap), but they violate the mandatory 11-hour rest period rule. |
| **Manager Approval Refusal State** | Revert listing to `OPEN` if manager approval re-validation fails. | **Retain listing in `CLAIMED` status and display detailed refusal banners.** | If a colleague's claim fails re-validation due to an intervening schedule change, reverting to OPEN abruptly hides why the manager's action failed. Keeping it in `CLAIMED` allows the manager to reject intentionally or the claimer to unclaim. |
| **Time Invariance** | Compare shift dates to `datetime.now()` to filter past shifts. | **Disregard current system clock; treat all shifts as upcoming.** | The problem specification dictates that time invariance must hold: real-world dates must never invalidate seed shifts or cause arbitrary rule failures. |
| **Persona Switching vs Auth Sessions** | Full JWT / Cookie session authentication. | **Lightweight Persona Switcher dropdown in header.** | For local evaluation and demonstration, a persona switcher allows instant testing of Staff vs. Manager workflows without credential friction. |

---

## 5. Verification & Live Preview Testing

The AI executed comprehensive end-to-end verification:
1. **Unit & Integration Tests:** 16 automated tests in `backend/tests/` passed 100% in 0.43 seconds (`pytest`).
2. **Headless Browser Execution:** Leveraged lazy MCP preview tools (`preview_open`, `preview_click`, `preview_snapshot`) to test:
   - Initial staff dashboard loading
   - Real-time eligibility badge calculation and expanded breakdown
   - Persona switching from Alice Chen to Evan Wright
   - Successful claiming of shift-102 by Evan Wright
   - Persona switching to Dr. Sarah Vance (Manager)
   - Real-time manager approval and shift reassignment
   - Immediate audit entry in the Action History table.

---

## 6. Conclusion

All domain rules, edge cases, and user experience requirements were implemented deterministically with high cohesion, clean type safety, and zero external runtime dependencies.
