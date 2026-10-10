import uuid
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..models import (
    Listing,
    PostListingRequest,
    SimpleActionRequest,
    RuleViolation
)
from ..database import (
    get_staff_by_id,
    get_shift_by_id,
    get_shifts_assigned_to,
    get_all_listings,
    get_listing_by_id,
    get_active_listing_for_shift,
    create_listing_record,
    update_listing_status,
    update_shift_assigned_to,
    log_action
)
from ..rules_engine import ClaimValidator

router = APIRouter(prefix="/api/listings", tags=["listings"])

@router.get("", response_model=List[Listing])
def list_all_listings():
    return get_all_listings()

@router.post("", response_model=Listing)
def post_listing(req: PostListingRequest):
    actor = get_staff_by_id(req.actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    if actor.role != "STAFF":
        log_action(actor.id, actor.name, "POST", req.shift_id, None, "REFUSED", "Only staff members can post shifts")
        raise HTTPException(status_code=403, detail="Only staff members can post shifts")

    shift = get_shift_by_id(req.shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.assigned_to != actor.id:
        log_action(actor.id, actor.name, "POST", shift.id, None, "REFUSED", "You can only list shifts assigned to you")
        raise HTTPException(status_code=403, detail="You can only list shifts assigned to you")

    active_listing = get_active_listing_for_shift(shift.id)
    if active_listing:
        log_action(actor.id, actor.name, "POST", shift.id, active_listing.id, "REFUSED", f"Shift already has an active listing ({active_listing.status})")
        raise HTTPException(status_code=400, detail="Shift already has an active listing")

    listing_id = f"listing-{uuid.uuid4().hex[:8]}"
    new_listing = Listing(
        id=listing_id,
        shift_id=shift.id,
        status="OPEN",
        poster_id=actor.id,
        claimed_by=None
    )
    create_listing_record(new_listing)
    log_action(actor.id, actor.name, "POST", shift.id, listing_id, "SUCCESS", f"Posted shift {shift.id} for swap")
    return new_listing

@router.post("/{listing_id}/withdraw", response_model=Listing)
def withdraw_listing(listing_id: str, req: SimpleActionRequest):
    actor = get_staff_by_id(req.actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.poster_id != actor.id:
        log_action(actor.id, actor.name, "WITHDRAW", listing.shift_id, listing.id, "REFUSED", "Only the poster can withdraw this listing")
        raise HTTPException(status_code=403, detail="Only the poster can withdraw this listing")

    if listing.status != "OPEN":
        reason = f"Cannot withdraw listing with status '{listing.status}'"
        log_action(actor.id, actor.name, "WITHDRAW", listing.shift_id, listing.id, "REFUSED", reason)
        raise HTTPException(status_code=400, detail=reason)

    update_listing_status(listing.id, "WITHDRAWN", None)
    log_action(actor.id, actor.name, "WITHDRAW", listing.shift_id, listing.id, "SUCCESS", f"Withdrew swap listing for shift {listing.shift_id}")
    
    listing.status = "WITHDRAWN"
    return listing

@router.post("/{listing_id}/claim", response_model=Listing)
def claim_listing(listing_id: str, req: SimpleActionRequest):
    actor = get_staff_by_id(req.actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    if actor.role != "STAFF":
        log_action(actor.id, actor.name, "CLAIM", "unknown", listing_id, "REFUSED", "Managers cannot claim shifts")
        raise HTTPException(status_code=403, detail="Managers cannot claim shifts")

    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    shift = get_shift_by_id(listing.shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    # Evaluate claim rules
    assigned_shifts = get_shifts_assigned_to(actor.id)
    result = ClaimValidator.validate_claim(actor, shift, listing, assigned_shifts)

    if not result.eligible:
        reason_strs = [v.message for v in result.violations]
        details = "; ".join(reason_strs)
        log_action(actor.id, actor.name, "CLAIM", shift.id, listing.id, "REFUSED", f"Claim refused: {details}")
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Claim refused",
                "violations": [v.model_dump() for v in result.violations]
            }
        )

    # Claim succeeds
    update_listing_status(listing.id, "CLAIMED", actor.id)
    log_action(actor.id, actor.name, "CLAIM", shift.id, listing.id, "SUCCESS", f"Claimed shift {shift.id}")

    listing.status = "CLAIMED"
    listing.claimed_by = actor.id
    return listing

@router.post("/{listing_id}/unclaim", response_model=Listing)
def unclaim_listing(listing_id: str, req: SimpleActionRequest):
    actor = get_staff_by_id(req.actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.status != "CLAIMED":
        reason = f"Listing is not currently claimed (status: {listing.status})"
        log_action(actor.id, actor.name, "UNCLAIM", listing.shift_id, listing.id, "REFUSED", reason)
        raise HTTPException(status_code=400, detail=reason)

    if listing.claimed_by != actor.id:
        log_action(actor.id, actor.name, "UNCLAIM", listing.shift_id, listing.id, "REFUSED", "Only the staff member who claimed this shift can unclaim it")
        raise HTTPException(status_code=403, detail="Only the staff member who claimed this shift can unclaim it")

    update_listing_status(listing.id, "OPEN", None)
    log_action(actor.id, actor.name, "UNCLAIM", listing.shift_id, listing.id, "SUCCESS", f"Unclaimed shift {listing.shift_id}")

    listing.status = "OPEN"
    listing.claimed_by = None
    return listing

@router.post("/{listing_id}/approve", response_model=Listing)
def approve_listing(listing_id: str, req: SimpleActionRequest):
    actor = get_staff_by_id(req.actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    if actor.role != "MANAGER":
        log_action(actor.id, actor.name, "APPROVE", "unknown", listing_id, "REFUSED", "Only managers can approve shift swaps")
        raise HTTPException(status_code=403, detail="Only managers can approve shift swaps")

    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.status != "CLAIMED":
        reason = f"Only claimed listings can be approved (current status: {listing.status})"
        log_action(actor.id, actor.name, "APPROVE", listing.shift_id, listing.id, "REFUSED", reason)
        raise HTTPException(status_code=400, detail=reason)

    shift = get_shift_by_id(listing.shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    claimer = get_staff_by_id(listing.claimed_by) if listing.claimed_by else None
    if not claimer:
        raise HTTPException(status_code=400, detail="Listing does not have a valid claimer")

    # Re-validate Rules 2-5 against C's current assigned shifts at this exact moment
    claimer_shifts = get_shifts_assigned_to(claimer.id)
    result = ClaimValidator.validate_claim(
        claimer=claimer,
        shift=shift,
        listing=listing,
        claimer_assigned_shifts=claimer_shifts,
        is_approval=True
    )

    if not result.eligible:
        reason_strs = [v.message for v in result.violations]
        details = "; ".join(reason_strs)
        log_action(actor.id, actor.name, "APPROVE", shift.id, listing.id, "REFUSED", f"Approval refused: {details}")
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Approval refused: labour rules violated",
                "violations": [v.model_dump() for v in result.violations]
            }
        )

    # Approve succeeds: reassign shift to claimer, mark listing APPROVED
    poster = get_staff_by_id(listing.poster_id)
    poster_name = poster.name if poster else listing.poster_id

    update_shift_assigned_to(shift.id, claimer.id)
    update_listing_status(listing.id, "APPROVED", claimer.id)

    log_action(
        actor.id,
        actor.name,
        "APPROVE",
        shift.id,
        listing.id,
        "SUCCESS",
        f"Approved swap: reassigned shift {shift.id} from {poster_name} to {claimer.name}"
    )

    listing.status = "APPROVED"
    return listing

@router.post("/{listing_id}/reject", response_model=Listing)
def reject_listing(listing_id: str, req: SimpleActionRequest):
    actor = get_staff_by_id(req.actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    if actor.role != "MANAGER":
        log_action(actor.id, actor.name, "REJECT", "unknown", listing_id, "REFUSED", "Only managers can reject shift claims")
        raise HTTPException(status_code=403, detail="Only managers can reject shift claims")

    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.status != "CLAIMED":
        reason = f"Only claimed listings can be rejected (current status: {listing.status})"
        log_action(actor.id, actor.name, "REJECT", listing.shift_id, listing.id, "REFUSED", reason)
        raise HTTPException(status_code=400, detail=reason)

    claimer_id = listing.claimed_by
    claimer = get_staff_by_id(claimer_id) if claimer_id else None
    claimer_name = claimer.name if claimer else (claimer_id or "unknown")

    # Reject reverts listing to OPEN and clears claimed_by
    update_listing_status(listing.id, "OPEN", None)
    log_action(
        actor.id,
        actor.name,
        "REJECT",
        listing.shift_id,
        listing.id,
        "SUCCESS",
        f"Rejected claim by {claimer_name} on shift {listing.shift_id}; listing returned to OPEN"
    )

    listing.status = "OPEN"
    listing.claimed_by = None
    return listing
