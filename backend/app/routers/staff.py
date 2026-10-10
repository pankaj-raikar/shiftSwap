from fastapi import APIRouter, HTTPException
from typing import List
from ..models import Staff
from ..database import get_all_staff, get_staff_by_id

router = APIRouter(prefix="/api/staff", tags=["staff"])

@router.get("", response_model=List[Staff])
def list_staff():
    return get_all_staff()

@router.get("/{staff_id}", response_model=Staff)
def get_single_staff(staff_id: str):
    staff = get_staff_by_id(staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return staff
