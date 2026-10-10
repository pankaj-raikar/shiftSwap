from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from .models import Shift, Staff, Listing, RuleViolation, EligibilityResult

def parse_iso(dt_str: str) -> datetime:
    """Parse ISO datetime string YYYY-MM-DDTHH:MM without timezone."""
    return datetime.fromisoformat(dt_str)

def get_week_monday(dt: datetime) -> datetime:
    """Get the Monday 00:00:00 of the week dt falls into."""
    return dt.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=dt.weekday())

def get_shift_duration_hours(shift: Shift) -> float:
    """Get duration of a shift in hours."""
    start = parse_iso(shift.start)
    end = parse_iso(shift.end)
    return (end - start).total_seconds() / 3600.0

def fmt_hours(hours: float) -> str:
    """Format hours cleanly (e.g., 8 or 8.5)."""
    return f"{hours:g}"

class ClaimValidator:
    """
    Validates claim requests and manager approvals according to Rules 1 to 5.
    """

    @staticmethod
    def validate_claim(
        claimer: Staff,
        shift: Shift,
        listing: Optional[Listing],
        claimer_assigned_shifts: List[Shift],
        is_approval: bool = False
    ) -> EligibilityResult:
        """
        Validates whether claimer C can claim shift S owned by P.
        
        Evaluation hierarchy:
        1. Availability Check (for claims; skipped if is_approval since listing is CLAIMED)
        2. Rule 1: C is not P (if violated, return only Rule 1)
        3. Rules 2-5: Evaluate all simultaneously and report every violation.
        """
        violations: List[RuleViolation] = []
        
        # Calculate weekly hours metrics for informative display
        shift_dur = get_shift_duration_hours(shift)
        s_start = parse_iso(shift.start)
        week_monday = get_week_monday(s_start)
        next_week_monday = week_monday + timedelta(days=7)
        
        # Calculate C's current hours in this week window
        current_weekly_hours = 0.0
        for assigned in claimer_assigned_shifts:
            ass_start = parse_iso(assigned.start)
            if week_monday <= ass_start < next_week_monday:
                current_weekly_hours += get_shift_duration_hours(assigned)
        
        weekly_hours_after = current_weekly_hours + shift_dur

        # 1. Availability Check
        if not is_approval:
            if listing is None or listing.status != "OPEN":
                violations.append(RuleViolation(
                    rule_number=0,
                    rule_name="Availability Check",
                    message="Listing is no longer available"
                ))
                return EligibilityResult(
                    eligible=False,
                    violations=violations,
                    weekly_hours_before=current_weekly_hours,
                    shift_hours=shift_dur,
                    weekly_hours_after=weekly_hours_after
                )

        # 2. Rule 1: Self-Claim Check (C is not P)
        # Note: If is_approval, C is claimer and P is poster/owner. C != P was already verified,
        # but check regardless if claimer is shift owner.
        if claimer.id == shift.assigned_to:
            violations.append(RuleViolation(
                rule_number=1,
                rule_name="Self-Claim",
                message="Cannot claim your own shift"
            ))
            # Stop and do not evaluate rules 2-5!
            return EligibilityResult(
                eligible=False,
                violations=violations,
                weekly_hours_before=current_weekly_hours,
                shift_hours=shift_dur,
                weekly_hours_after=weekly_hours_after
            )

        # 3. Labour & Schedule Checks (Rules 2-5)
        
        # Rule 2: Certification Check
        if shift.required_certification:
            if shift.required_certification not in claimer.certifications:
                violations.append(RuleViolation(
                    rule_number=2,
                    rule_name="Certification",
                    message=f"Missing required certification: {shift.required_certification}"
                ))

        # Check overlapping shifts vs non-overlapping shifts for Rules 3 & 4
        s_end = parse_iso(shift.end)
        
        for assigned in claimer_assigned_shifts:
            # Skip comparing the shift with itself if it somehow were in assigned list
            if assigned.id == shift.id:
                continue

            a_start = parse_iso(assigned.start)
            a_end = parse_iso(assigned.end)

            # Rule 3: Direct Overlap (A.start < B.end AND B.start < A.end)
            is_overlap = (s_start < a_end) and (a_start < s_end)
            if is_overlap:
                violations.append(RuleViolation(
                    rule_number=3,
                    rule_name="Direct Overlap",
                    message=f"Overlaps with assigned shift {assigned.id} ({assigned.start} - {assigned.end})",
                    conflicting_shift_id=assigned.id,
                    conflicting_shift_times=f"{assigned.start} - {assigned.end}"
                ))
            else:
                # Rule 4: 11-Hour Rest Period
                # Evaluated ONLY for shifts that DO NOT overlap S
                # Gap calculation:
                if a_end <= s_start:
                    gap_seconds = (s_start - a_end).total_seconds()
                elif s_end <= a_start:
                    gap_seconds = (a_start - s_end).total_seconds()
                else:
                    gap_seconds = 0

                gap_minutes = int(gap_seconds // 60)
                if gap_minutes < 660:  # 11 hours = 660 minutes
                    gap_hours = gap_minutes // 60
                    rem_minutes = gap_minutes % 60
                    violations.append(RuleViolation(
                        rule_number=4,
                        rule_name="11-Hour Rest Period",
                        message=f"Insufficient rest period (less than 11 hours) with shift {assigned.id} ({assigned.start} - {assigned.end}). Gap is {gap_hours}h {rem_minutes}m",
                        conflicting_shift_id=assigned.id,
                        conflicting_shift_times=f"{assigned.start} - {assigned.end}"
                    ))

        # Rule 5: Weekly Maximum Hours (<= 40.0 hours)
        if weekly_hours_after > 40.0:
            week_start_str = week_monday.strftime("%Y-%m-%d")
            curr_str = fmt_hours(current_weekly_hours)
            shift_str = fmt_hours(shift_dur)
            tot_str = fmt_hours(weekly_hours_after)
            violations.append(RuleViolation(
                rule_number=5,
                rule_name="Weekly Maximum Hours",
                message=f"Total weekly hours ({curr_str}h + {shift_str}h = {tot_str}h) would exceed 40 hour limit for week starting {week_start_str}"
            ))

        return EligibilityResult(
            eligible=(len(violations) == 0),
            violations=violations,
            weekly_hours_before=current_weekly_hours,
            shift_hours=shift_dur,
            weekly_hours_after=weekly_hours_after
        )
