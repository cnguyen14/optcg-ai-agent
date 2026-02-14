# Import all tools so the @register_tool decorator runs
from app.agents.tools.response import ResponseTool
from app.agents.tools.search_cards import SearchCardsTool
from app.agents.tools.get_deck_info import GetDeckInfoTool
from app.agents.tools.validate_deck import ValidateDeckTool
from app.agents.tools.search_knowledge import SearchKnowledgeTool
from app.agents.tools.calculate_stats import CalculateStatsTool
from app.agents.tools.set_deck_leader import SetDeckLeaderTool
from app.agents.tools.add_cards_to_deck import AddCardsToDeckTool
from app.agents.tools.remove_cards_from_deck import RemoveCardsFromDeckTool
from app.agents.tools.query_data import QueryDataTool
from app.agents.tools.modify_deck import ModifyDeckTool

__all__ = [
    "ResponseTool",
    "SearchCardsTool",
    "GetDeckInfoTool",
    "ValidateDeckTool",
    "SearchKnowledgeTool",
    "CalculateStatsTool",
    "SetDeckLeaderTool",
    "AddCardsToDeckTool",
    "RemoveCardsFromDeckTool",
    "QueryDataTool",
    "ModifyDeckTool",
]
