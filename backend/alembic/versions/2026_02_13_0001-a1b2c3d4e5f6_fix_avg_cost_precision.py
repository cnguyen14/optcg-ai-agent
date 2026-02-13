"""Fix avg_cost precision from DECIMAL(3,2) to DECIMAL(5,2)

Revision ID: a1b2c3d4e5f6
Revises: 5e45decf5c47
Create Date: 2026-02-13 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '5e45decf5c47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('decks', 'avg_cost',
        type_=sa.DECIMAL(precision=5, scale=2),
        existing_type=sa.DECIMAL(precision=3, scale=2),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column('decks', 'avg_cost',
        type_=sa.DECIMAL(precision=3, scale=2),
        existing_type=sa.DECIMAL(precision=5, scale=2),
        existing_nullable=True,
    )
