from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_donors():
    return {"message": "Donors route working!"}
