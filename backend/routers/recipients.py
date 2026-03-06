from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_recipients():
    return {"message": "Recipients route working!"}
