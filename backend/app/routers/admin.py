from fastapi import APIRouter
from ..database import init_db

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.post("/reset")
def reset_database():
    init_db(force_reset=True)
    return {"message": "Database reset to pristine seed data successfully"}
