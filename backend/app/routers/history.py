from fastapi import APIRouter
from typing import List
from ..models import ActionHistoryItem
from ..database import get_action_history

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("", response_model=List[ActionHistoryItem])
def list_history():
    return get_action_history()
