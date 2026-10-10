# ShiftSwap — Clinic Shift Swapping & Labour Rule Compliance System

**ShiftSwap** is a production-ready, full-stack web application designed for healthcare clinics to manage peer-to-peer shift swaps with automated, auditable labour standards enforcement.

ShiftSwap enforces strict labour laws and clinic scheduling rules at every step of the swap lifecycle—from real-time eligibility evaluation on the open marketplace to final Manager approval re-validation.

---

## 🚀 Quick Start (Single-Command Run)

Run the entire application locally with a single command (requires only **Python 3.10+** and **Node.js 18+**; no paid services, docker, or external API keys needed):

```bash
./start.sh
```

Once started:
- **Application UI:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Running Automated Tests

Run the full backend test suite covering the compliance rules engine, edge cases, and API lifecycle:

```bash
pytest -v
```

All 16 unit and integration tests validate:
- Availability checks
- Rule 1 (Self-Claim) isolation
- Rule 2 (Required Certification)
- Rule 3 (Shift Overlap)
- Rule 4 (11-Hour Minimum Rest Period between shifts)
- Rule 5 (40-Hour Weekly Workload Cap)
- Cross-midnight overnight shifts and Monday-to-Monday week calculation
- Simultaneous multi-rule failure reporting
- Manager approval re-validation and refusal

---

## 🏗️ System Architecture

ShiftSwap is built as a cohesive, lightweight full-stack application:

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
  - **Rules Engine:** Pure, deterministic `ClaimValidator` class implementing rules 1 through 5.
  - **Storage:** Embedded [SQLite3](https://www.sqlite.org/) (`shiftswap.db`) with zero external database dependencies.
  - **Static Asset Delivery:** FastAPI serves the compiled React single-page application directly in production mode.
- **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/) + [Tailwind CSS](https://tailwindcss.com/)
  - **Persona Switcher:** Seamlessly toggle between Staff and Manager roles in the top navigation bar to test the entire lifecycle from multiple perspectives.
  - **Real-Time Eligibility Engine:** Marketplace cards immediately show whether the active staff member can claim a shift, including detailed rule violation breakdowns.
  - **Manager Approvals Queue:** Dedicated dashboard for clinic managers to approve or reject pending claims, with real-time re-validation diagnostics.
  - **Audit Log / Action History:** Comprehensive table of all swap events, actors, timestamps, and compliance refusal reasons.
  - **Clinic Schedule Roster:** Visual timeline grouped by date showing coverage and assigned staff.

---

## 📋 Core Labour Rules Specification & Validation Hierarchy

All shift validation logic is governed by a strict hierarchy:

```
Claim Request Initiated
         │
         ▼
[Availability Check] ─────────── Listing status != 'OPEN'?
         │                               │
       OPEN                             YES ──► Refuse: "Listing is no longer available"
         │                                      (Stop immediately. Do not evaluate Rules 1-5)
         ▼
     [Rule 1] ────────────────── Claimer is Poster (C == P)?
         │                               │
       C != P                           YES ──► Refuse: "Cannot claim your own shift"
         │                                      (Stop immediately. Do not evaluate Rules 2-5)
         ▼
[Simultaneous Evaluation: Rules 2 to 5]
   ├── Rule 2 (Certification): Staff possesses required certification (if any)
   ├── Rule 3 (Overlap): No overlapping assigned shifts
   ├── Rule 4 (11h Rest Period): ≥ 11h gap between shift ends and starts (for non-overlapping shifts)
   └── Rule 5 (Weekly Max): Total weekly hours across week (Mon 00:00 - Mon 00:00) ≤ 40.0h
         │
         ├── Any Failures? ──► Refuse and report ALL violated rules simultaneously
         └── All Passed?   ──► Eligible / Claim approved
```

### 1. Refusal Diagnostic Messages (Exact Format)
- **Availability:** `"Listing is no longer available"`
- **Rule 1 (Self-Claim):** `"Cannot claim your own shift"`
- **Rule 2 (Certification):** `"Missing required certification: {cert}"`
- **Rule 3 (Overlap):** `"Overlaps with assigned shift {id} ({start} - {end})"`
- **Rule 4 (11h Rest Period):** `"Insufficient rest period (less than 11 hours) with shift {id} ({start} - {end}). Gap is {hours}h {minutes}m"`
- **Rule 5 (Weekly Maximum):** `"Total weekly hours ({current_hours}h + {shift_hours}h = {total_hours}h) would exceed 40 hour limit for week starting {week_start_date}"`

### 2. Manager Approval Re-Validation
When a Manager approves a shift swap:
1. Rules 2 through 5 are **re-evaluated at that exact moment** against the claimer's current assigned schedule.
2. If another shift was assigned or approved in the interim causing a conflict (e.g., overlapping shift or weekly hours exceeding 40h), the approval is **refused**.
3. The listing **remains in CLAIMED status** with all refusal reasons displayed, preventing accidental schedule corruption.

---

## 👥 Seed Dataset & Persona Guide

The system includes a pre-seeded clinic schedule (`seed.json`) spanning 2 weeks (Oct 12 to Oct 25, 2026), with zero initial rule violations.

### Staff Personas
| Name | Role | Certifications | Baseline Hours | Description |
|---|---|---|---|---|
| **Alice Chen** (`staff-1`) | Staff | Triage, ICU | 32h | Busy nurse, has night and day shifts. |
| **Bob Miller** (`staff-2`) | Staff | Pediatrics, Phlebotomy | 24h | Has listed shift `shift-102` on the marketplace. |
| **Charlie Kim** (`staff-3`) | Staff | ICU, Phlebotomy | 24h | Experienced clinician. |
| **Diana Ross** (`staff-4`) | Staff | Triage | 24h | Has listed shift `shift-104` (claimed by Alice). |
| **Evan Wright** (`staff-5`) | Staff | Pediatrics, ICU | 28h | Eligible to claim Bob's pediatric shift! |

### Manager Personas
| Name | Role | Authority |
|---|---|---|
| **Dr. Sarah Vance** (`mgr-1`) | Manager | Clinic Approver — can review, approve, or reject pending swaps. |
| **Marcus Brody** (`mgr-2`) | Manager | Operations Director — can review, approve, or reject pending swaps. |

---

## ⚙️ Key Assumptions & Engineering Decisions

1. **Local Clinic Time (`YYYY-MM-DDTHH:MM`):**
   - Datetimes are treated as clinic local time without UTC offsets or timezone conversions, ensuring portability and eliminating daylight saving time edge-case bugs.
2. **Cross-Midnight Shifts:**
   - Handled by parsing exact minute differences. Overnight shifts display a moon badge and indicate `(+1 day)` on the UI.
3. **Week Window Definition:**
   - A week strictly runs from **Monday 00:00:00 to the following Monday 00:00:00**.
   - If a shift starts in Week 1 and ends in Week 2, its full duration is attributed to the week in which it **started**.
4. **Boundary Minutes & Rest Gap:**
   - Shifts that touch back-to-back (e.g. 07:00–15:00 and 15:00–23:00) have a gap of `0h 0m` and are evaluated by Rule 4 (11h rest violation).
   - Rule 4 is evaluated strictly for non-overlapping shifts; overlapping shifts are caught exclusively by Rule 3.
5. **Database Auto-Seeding:**
   - The application automatically seeds from `seed.json` on fresh launch. A **"Reset Seed"** button is provided in the header to return the clinic to its initial pristine state at any time.

---

## 🛠️ Manual Development Setup (Optional)

If you prefer to run frontend and backend separately in development mode:

### Backend
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
(The Vite dev server runs on `http://localhost:5173` and proxies `/api` calls to `http://localhost:8000`.)
