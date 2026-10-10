import pytest
from app.models import Staff, Shift, Listing
from app.rules_engine import ClaimValidator

def create_staff(id="staff-1", name="Test Staff", certifications=None, role="STAFF"):
    return Staff(
        id=id,
        name=name,
        role=role,
        certifications=certifications or []
    )

def create_shift(id="shift-1", start="2026-10-12T08:00", end="2026-10-12T16:00", required_cert=None, assigned_to="staff-other"):
    return Shift(
        id=id,
        start=start,
        end=end,
        required_certification=required_cert,
        assigned_to=assigned_to
    )

def create_listing(id="listing-1", shift_id="shift-1", status="OPEN", poster_id="staff-other"):
    return Listing(
        id=id,
        shift_id=shift_id,
        status=status,
        poster_id=poster_id,
        claimed_by=None
    )

def test_availability_check():
    claimer = create_staff("staff-1")
    shift = create_shift("shift-1", assigned_to="staff-2")
    
    # Listing is None
    res = ClaimValidator.validate_claim(claimer, shift, None, [])
    assert not res.eligible
    assert len(res.violations) == 1
    assert res.violations[0].message == "Listing is no longer available"
    
    # Listing is CLAIMED
    claimed_listing = create_listing(status="CLAIMED")
    res = ClaimValidator.validate_claim(claimer, shift, claimed_listing, [])
    assert not res.eligible
    assert len(res.violations) == 1
    assert res.violations[0].message == "Listing is no longer available"

    # Listing is WITHDRAWN
    withdrawn_listing = create_listing(status="WITHDRAWN")
    res = ClaimValidator.validate_claim(claimer, shift, withdrawn_listing, [])
    assert not res.eligible
    assert len(res.violations) == 1
    assert res.violations[0].message == "Listing is no longer available"

def test_rule_1_self_claim_only():
    claimer = create_staff("staff-1", certifications=[])
    # Shift requires ICU and overlaps, but owned by claimer
    shift = create_shift("shift-1", start="2026-10-12T08:00", end="2026-10-12T16:00", required_cert="ICU", assigned_to="staff-1")
    listing = create_listing(shift_id="shift-1", poster_id="staff-1")
    assigned = [
        create_shift("shift-2", start="2026-10-12T09:00", end="2026-10-12T17:00", assigned_to="staff-1")
    ]
    
    res = ClaimValidator.validate_claim(claimer, shift, listing, assigned)
    assert not res.eligible
    # Only Rule 1 must be reported!
    assert len(res.violations) == 1
    assert res.violations[0].rule_number == 1
    assert res.violations[0].message == "Cannot claim your own shift"

def test_rule_2_certification():
    shift = create_shift("shift-1", required_cert="ICU", assigned_to="staff-2")
    listing = create_listing(shift_id="shift-1", poster_id="staff-2")
    
    # Missing certification
    claimer_no_cert = create_staff("staff-1", certifications=["Triage"])
    res = ClaimValidator.validate_claim(claimer_no_cert, shift, listing, [])
    assert not res.eligible
    assert any(v.rule_number == 2 and "Missing required certification: ICU" in v.message for v in res.violations)
    
    # Has certification
    claimer_with_cert = create_staff("staff-1", certifications=["Triage", "ICU"])
    res = ClaimValidator.validate_claim(claimer_with_cert, shift, listing, [])
    assert res.eligible
    assert len(res.violations) == 0

def test_rule_3_direct_overlap():
    shift = create_shift("shift-target", start="2026-10-12T10:00", end="2026-10-12T18:00", assigned_to="staff-2")
    listing = create_listing(shift_id="shift-target", poster_id="staff-2")
    claimer = create_staff("staff-1")
    
    # Overlapping shift: 12:00 to 20:00
    assigned = [
        create_shift("shift-existing", start="2026-10-12T12:00", end="2026-10-12T20:00", assigned_to="staff-1")
    ]
    res = ClaimValidator.validate_claim(claimer, shift, listing, assigned)
    assert not res.eligible
    assert len(res.violations) == 1
    assert res.violations[0].rule_number == 3
    assert "Overlaps with assigned shift shift-existing (2026-10-12T12:00 - 2026-10-12T20:00)" in res.violations[0].message

def test_rule_4_rest_period():
    shift = create_shift("shift-target", start="2026-10-12T18:00", end="2026-10-13T02:00", assigned_to="staff-2")
    listing = create_listing(shift_id="shift-target", poster_id="staff-2")
    claimer = create_staff("staff-1")
    
    # Gap is 8 hours (ends at 10:00, target starts at 18:00 -> 8h gap < 11h)
    assigned_earlier = [
        create_shift("shift-prior", start="2026-10-12T02:00", end="2026-10-12T10:00", assigned_to="staff-1")
    ]
    res = ClaimValidator.validate_claim(claimer, shift, listing, assigned_earlier)
    assert not res.eligible
    assert any(v.rule_number == 4 for v in res.violations)
    v4 = [v for v in res.violations if v.rule_number == 4][0]
    assert "Insufficient rest period (less than 11 hours) with shift shift-prior" in v4.message
    assert "Gap is 8h 0m" in v4.message

    # Exactly 11 hours gap (ends at 07:00, target starts at 18:00 -> 11h 0m gap) -> ALLOWED (inclusive)
    assigned_exact_11h = [
        create_shift("shift-prior", start="2026-10-11T23:00", end="2026-10-12T07:00", assigned_to="staff-1")
    ]
    res = ClaimValidator.validate_claim(claimer, shift, listing, assigned_exact_11h)
    assert res.eligible
    assert len(res.violations) == 0

    # 10 hours 59 minutes gap (ends at 07:01, target starts at 18:00 -> 659 mins) -> VIOLATION
    assigned_10h59m = [
        create_shift("shift-prior", start="2026-10-11T23:00", end="2026-10-12T07:01", assigned_to="staff-1")
    ]
    res = ClaimValidator.validate_claim(claimer, shift, listing, assigned_10h59m)
    assert not res.eligible
    assert any(v.rule_number == 4 and "Gap is 10h 59m" in v.message for v in res.violations)

def test_rule_5_weekly_maximum_hours():
    claimer = create_staff("staff-1")
    # Week starts Monday 2026-10-12T00:00 to Monday 2026-10-19T00:00
    # Claimer already has 36 hours in this week:
    # 4 shifts of 9 hours each
    assigned = [
        create_shift("s1", start="2026-10-12T07:00", end="2026-10-12T16:00", assigned_to="staff-1"), # 9h
        create_shift("s2", start="2026-10-13T07:00", end="2026-10-13T16:00", assigned_to="staff-1"), # 9h
        create_shift("s3", start="2026-10-14T07:00", end="2026-10-14T16:00", assigned_to="staff-1"), # 9h
        create_shift("s4", start="2026-10-15T07:00", end="2026-10-15T16:00", assigned_to="staff-1"), # 9h
    ] # Total = 36h
    
    # Target shift on Saturday Oct 17, 8 hours
    shift_8h = create_shift("target-8h", start="2026-10-17T08:00", end="2026-10-17T16:00", assigned_to="staff-2")
    listing_8h = create_listing(shift_id="target-8h", poster_id="staff-2")
    
    # 36 + 8 = 44h > 40h
    res = ClaimValidator.validate_claim(claimer, shift_8h, listing_8h, assigned)
    assert not res.eligible
    v5 = [v for v in res.violations if v.rule_number == 5]
    assert len(v5) == 1
    assert "Total weekly hours (36h + 8h = 44h) would exceed 40 hour limit for week starting 2026-10-12" in v5[0].message

    # Target shift of 4 hours: 36 + 4 = 40.0h -> ALLOWED (inclusive)
    shift_4h = create_shift("target-4h", start="2026-10-17T08:00", end="2026-10-17T12:00", assigned_to="staff-2")
    listing_4h = create_listing(shift_id="target-4h", poster_id="staff-2")
    res = ClaimValidator.validate_claim(claimer, shift_4h, listing_4h, assigned)
    assert res.eligible

def test_cross_midnight_week_assignment():
    # A shift starting Sunday night 2026-10-18T22:00 and ending Monday morning 2026-10-19T06:00 (8h)
    # Belongs to week starting Monday 2026-10-12
    claimer = create_staff("staff-1")
    assigned = [
        create_shift("s1", start="2026-10-18T22:00", end="2026-10-19T06:00", assigned_to="staff-1") # 8h in week Oct 12
    ]
    # Target shift on Monday 2026-10-19T18:00 (which is in week starting Oct 19)
    # The 8 hours from Sunday night do NOT count toward week starting Oct 19
    shift_next_week = create_shift("target-next", start="2026-10-19T18:00", end="2026-10-20T02:00", assigned_to="staff-2")
    listing = create_listing(shift_id="target-next", poster_id="staff-2")
    
    res = ClaimValidator.validate_claim(claimer, shift_next_week, listing, assigned)
    assert res.eligible
    assert res.weekly_hours_before == 0.0
    assert res.weekly_hours_after == 8.0

def test_simultaneous_violations():
    # Test that when C != P, Rules 2, 3, 4, 5 are all evaluated and reported simultaneously
    claimer = create_staff("staff-1", certifications=["Triage"]) # Missing ICU
    
    # Target shift: Oct 12 12:00 to 20:00 (8h), requires ICU
    target_shift = create_shift("target", start="2026-10-12T12:00", end="2026-10-12T20:00", required_cert="ICU", assigned_to="staff-2")
    listing = create_listing(shift_id="target", poster_id="staff-2")
    
    # Claimer assigned shifts:
    # 1. Overlapping shift: Oct 12 14:00 to 22:00 (8h) -> triggers Rule 3
    # 2. Preceding non-overlapping shift: Oct 12 04:00 to 08:00 (4h) -> gap to target (12:00) is 4h < 11h -> triggers Rule 4
    # 3. Plus other shifts totaling > 40h when added -> triggers Rule 5
    assigned = [
        create_shift("s-overlap", start="2026-10-12T14:00", end="2026-10-12T22:00", assigned_to="staff-1"),
        create_shift("s-rest", start="2026-10-12T04:00", end="2026-10-12T08:00", assigned_to="staff-1"),
        create_shift("s3", start="2026-10-14T08:00", end="2026-10-14T20:00", assigned_to="staff-1"), # 12h
        create_shift("s4", start="2026-10-15T08:00", end="2026-10-15T20:00", assigned_to="staff-1"), # 12h
    ]
    # Total assigned hours: 8 + 4 + 12 + 12 = 36h. + 8h target = 44h (> 40h).
    
    res = ClaimValidator.validate_claim(claimer, target_shift, listing, assigned)
    assert not res.eligible
    rules_violated = {v.rule_number for v in res.violations}
    assert rules_violated == {2, 3, 4, 5}
