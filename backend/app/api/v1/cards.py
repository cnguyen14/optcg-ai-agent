from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, union_all
from app.models import Card, Leader
from app.schemas.card import CardResponse, LeaderResponse
from app.database import get_db
from app.services.card_sync import OPTCGAPIClient
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=list[CardResponse])
async def list_cards(
    search: str | None = Query(None, description="Search by card name"),
    color: str | None = Query(None, description="Filter by color"),
    type: str | None = Query(None, description="Filter by type"),
    set_code: str | None = Query(None, description="Filter by set"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List cards with optional filtering"""
    query = select(Card)

    # Apply filters
    if search:
        query = query.where(Card.name.ilike(f"%{search}%"))

    if color:
        query = query.where(Card.color.ilike(f"%{color}%"))

    if type:
        query = query.where(Card.type == type)

    if set_code:
        query = query.where(Card.set_code == set_code)

    # Apply pagination
    query = query.limit(limit).offset(offset).order_by(Card.id)

    result = await db.execute(query)
    cards = result.scalars().all()

    return cards


@router.get("/sets/", response_model=list[str])
async def list_sets(db: AsyncSession = Depends(get_db)):
    """List all distinct set codes from cards and leaders"""
    card_sets = select(Card.set_code).where(Card.set_code.isnot(None)).distinct()
    leader_sets = select(Leader.set_code).where(Leader.set_code.isnot(None)).distinct()
    combined = union_all(card_sets, leader_sets).subquery()
    query = select(combined.c.set_code).distinct().order_by(combined.c.set_code)
    result = await db.execute(query)
    return [row[0] for row in result.all()]


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(card_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific card by ID"""
    card = await db.get(Card, card_id)

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    return card


@router.get("/leaders/", response_model=list[LeaderResponse])
async def list_leaders(
    search: str | None = Query(None, description="Search by leader name"),
    color: str | None = Query(None, description="Filter by color"),
    set_code: str | None = Query(None, description="Filter by set"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List leader cards"""
    query = select(Leader)

    # Apply filters
    if search:
        query = query.where(Leader.name.ilike(f"%{search}%"))

    if color:
        query = query.where(Leader.colors.contains([color]))

    if set_code:
        query = query.where(Leader.set_code == set_code)

    # Apply pagination
    query = query.limit(limit).offset(offset).order_by(Leader.id)

    result = await db.execute(query)
    leaders = result.scalars().all()

    return leaders


@router.get("/leaders/{leader_id}", response_model=LeaderResponse)
async def get_leader(leader_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific leader by ID"""
    leader = await db.get(Leader, leader_id)

    if not leader:
        raise HTTPException(status_code=404, detail="Leader not found")

    return leader


@router.post("/sync")
async def sync_cards(db: AsyncSession = Depends(get_db)):
    """Sync cards from OPTCG API (admin endpoint)"""
    client = OPTCGAPIClient()

    try:
        result = await client.sync_to_database(db)
        return {
            "success": True,
            "message": "Cards synced successfully",
            "stats": result,
        }
    except Exception as e:
        logger.error(f"Error syncing cards: {e}")
        raise HTTPException(status_code=500, detail=f"Error syncing cards: {str(e)}")
