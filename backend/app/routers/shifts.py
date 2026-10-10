from fastapi import APIRouter, Query
from typing import List, Optional
from ..models import ShiftWithListing
from ..database import (
    get_all_shifts,
    get_all_listings,
    get_staff_by_id,
    get_shifts_assigned_to
)
from ..rules_engine import ClaimValidator, get_shift_duration_hours

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

@router.get("", response_model=List[ShiftWithListing])
def list_shifts(user_id: Optional[str] = Query(None)):
    all_shifts = get_all_shifts()
    all_listings = get_all_listings()
    
    # Map active listings by shift_id
    active_listings_by_shift = {}
    for l in all_listings:
        if l.status in ("OPEN", "CLAIMED"):
            active_listings_by_shift[l.shift_id] = l

    # If user_id provided, fetch user and their assigned shifts
    user = get_staff_by_id(user_id) if user_id else None
    user_assigned_shifts = get_shifts_assigned_to(user_id) if user_id else []

    staff_cache = {}
    def get_staff_name(sid: str) -> str:
        if sid not in staff_cache:
            s = get_staff_by_id(sid)
            staff_cache[sid] = s.name if s else sid
        return staff_cache[sid]

    results: List[ShiftWithListing] = []
    for s in all_shifts:
        listing = active_listings_by_shift.get(s.id)
        duration = get_shift_duration_hours(s)
        assigned_name = get_staff_name(s.assigned_to)

        eligibility = None
        if user and user.role == "STAFF":
            # Compute eligibility for this user claiming this shift
            eligibility = ClaimValidator.validate_claim(
                claimer=user,
                shift=s,
                listing=listing,
                claimer_assigned_shifts=user_assigned_shifts
            )

        results.append(ShiftWithListing(
            id=s.id,
            start=s.start,
            end=s.end,
            required_certification=s.required_certification,
            assigned_to=s.assigned_to,
            assigned_to_name=assigned_name,
            duration_hours=duration,
            listing=listing,
            eligibility=eligibility
        ))

    return results
