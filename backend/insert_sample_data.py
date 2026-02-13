import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Card, Leader
from datetime import datetime

async def insert_sample_data():
    engine = create_async_engine(
        "postgresql+asyncpg://optcg:dev_password@localhost:5433/optcg_dev"
    )
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Sample Leaders
        leaders = [
            Leader(
                id="OP01-001",
                name="Monkey D. Luffy",
                life=5,
                power=5000,
                colors=["Red"],
                attribute="Slash",
                text="[Activate: Main] [Once Per Turn] Give this Leader or 1 of your Characters up to 1 rested DON!! card",
                featured_character="Monkey D. Luffy",
                category="Straw Hat Crew",
                set_code="OP01",
                image_url="https://images.onepiece-cardgame.com/images/cardlist/Card_OP01-001_EN.png"
            ),
            Leader(
                id="OP01-031",
                name="Roronoa Zoro",
                life=4,
                power=6000,
                colors=["Green"],
                attribute="Slash",
                text="[Activate: Main] [Once Per Turn] You may trash 1 card from your hand: Add up to 1 DON!! card from your DON!! deck and set it as active.",
                featured_character="Roronoa Zoro",
                category="Straw Hat Crew",
                set_code="OP01",
                image_url="https://images.onepiece-cardgame.com/images/cardlist/Card_OP01-031_EN.png"
            ),
        ]
        
        # Sample Cards
        cards = [
            Card(
                id="OP01-002",
                name="Monkey D. Luffy",
                type="Character",
                color="Red",
                cost=5,
                power=6000,
                counter=1000,
                attribute="Slash",
                text="[DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters -2000 power during this turn.",
                rarity="SR",
                category="Straw Hat Crew",
                set_code="OP01"
            ),
            Card(
                id="OP01-003",
                name="Portgas D. Ace",
                type="Character",
                color="Red",
                cost=7,
                power=7000,
                counter=0,
                attribute="Special",
                text="[On Play] K.O. up to 1 of your opponent's Characters with 5000 power or less.",
                rarity="SR",
                category="Whitebeard Pirates",
                set_code="OP01"
            ),
            Card(
                id="OP01-024",
                name="Gum-Gum Red Hawk",
                type="Event",
                color="Red",
                cost=5,
                power=0,
                counter=0,
                text="[Main] K.O. up to 1 of your opponent's Characters with 6000 power or less.",
                rarity="UC",
                category="Straw Hat Crew",
                set_code="OP01"
            ),
            Card(
                id="OP01-032",
                name="Roronoa Zoro",
                type="Character",
                color="Green",
                cost=3,
                power=4000,
                counter=1000,
                attribute="Slash",
                text="[DON!! x1] This Character cannot be K.O.'d in battle by {Strike} attribute Characters.",
                rarity="R",
                category="Straw Hat Crew",
                set_code="OP01"
            ),
            Card(
                id="OP01-060",
                name="Nami",
                type="Character",
                color="Blue",
                cost=1,
                power=2000,
                counter=1000,
                attribute="Special",
                text="[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add it to your hand. Then, place the rest at the bottom of your deck in any order.",
                rarity="C",
                category="Straw Hat Crew",
                set_code="OP01"
            ),
        ]
        
        for leader in leaders:
            session.add(leader)
        
        for card in cards:
            session.add(card)
        
        await session.commit()
        print(f"✅ Inserted {len(leaders)} leaders and {len(cards)} cards")

if __name__ == "__main__":
    asyncio.run(insert_sample_data())
