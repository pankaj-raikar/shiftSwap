from typing import Optional, List
from pydantic import BaseModel, Field

class Staff(BaseModel):
    id: str
    name: str
    role: str  # "STAFF" | "MANAGER"
    certifications: List[str] = Field(default_factory=list)

class Shift(BaseModel):
    id: str
    start: str  # YYYY-MM-DDTHH:MM
    end: str    # YYYY-MM-DDTHH:MM
    required_certification: Optional[str] = None
    assigned_to: str

class Listing(BaseModel):
    id: str
    shift_id: str
    status: str  # "OPEN" | "CLAIMED" | "APPROVED" | "WITHDRAWN"
    poster_id: str
    claimed_by: Optional[str] = None

class ActionHistoryItem(BaseModel):
    id: int
    timestamp: str
    actor_id: str
    actor_name: str
    action_type: str  # "POST" | "WITHDRAW" | "CLAIM" | "UNCLAIM" | "APPROVE" | "REJECT"
    shift_id: str
    listing_id: Optional[str] = None
    outcome: str  # "SUCCESS" | "REFUSED"
    details: str

class RuleViolation(BaseModel):
    rule_number: int
    rule_name: str
    message: str
    conflicting_shift_id: Optional[str] = None
    conflicting_shift_times: Optional[str] = None

class EligibilityResult(BaseModel):
    eligible: bool
    violations: List[RuleViolation] = Field(default_factory=list)
    weekly_hours_before: float = 0.0
    shift_hours: float = 0.0
    weekly_hours_after: float = 0.0

class ShiftWithListing(BaseModel):
    id: str
    start: str
    end: str
    required_certification: Optional[str] = None
    assigned_to: str
    assigned_to_name: str
    duration_hours: float
    listing: Optional[Listing] = None
    eligibility: Optional[EligibilityResult] = None

class PostListingRequest(BaseModel):
    actor_id: str
    shift_id: str

class SimpleActionRequest(BaseModel):
    actor_id: str
