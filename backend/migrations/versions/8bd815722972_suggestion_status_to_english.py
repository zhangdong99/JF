"""suggestion status to english

Revision ID: 8bd815722972
Revises: 5e7ce4bd6060
Create Date: 2026-10-31 11:26:07.599494

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8bd815722972'
down_revision: Union[str, None] = '5e7ce4bd6060'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE product_governance.plan_suggestion SET status = CASE status
            WHEN '待确认' THEN 'pending'
            WHEN '已采纳' THEN 'adopted'
            WHEN '已驳回' THEN 'rejected'
            ELSE status
        END
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE product_governance.plan_suggestion SET status = CASE status
            WHEN 'pending' THEN '待确认'
            WHEN 'adopted' THEN '已采纳'
            WHEN 'rejected' THEN '已驳回'
            ELSE status
        END
        """
    )
