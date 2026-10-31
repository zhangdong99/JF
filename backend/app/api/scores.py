from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import ScoreDimension
from app.schemas import ApiResponse, DimensionOut, ScoreResultOut, ScoresIn
from app.services import crud, scoring

router = APIRouter(tags=["scores"])


@router.get("/score-dimensions", response_model=ApiResponse)
def list_dimensions(db: Session = Depends(get_db)):
    items = db.scalars(select(ScoreDimension).order_by(ScoreDimension.id)).all()
    return ApiResponse(data=[DimensionOut.model_validate(x) for x in items])


@router.post("/systems/{id}/scores", response_model=ApiResponse[ScoreResultOut])
def submit_scores(id: int, payload: ScoresIn, db: Session = Depends(get_db)):
    total, grade, detail = scoring.save_scores(
        db, id, [s.model_dump() for s in payload.scores], payload.comment
    )
    return ApiResponse(
        data=ScoreResultOut(system_id=id, total=total, grade=grade, detail=detail)
    )
