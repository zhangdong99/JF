"""add plan_suggestion base_content_md

Revision ID: 5e7ce4bd6060
Revises: a9957bee89fe
Create Date: 2026-10-31 11:06:18.554029

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e7ce4bd6060'
down_revision: Union[str, None] = 'a9957bee89fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "plan_suggestion",
        sa.Column("base_content_md", sa.Text(), nullable=True),
        schema="product_governance",
    )
    # 历史数据回填：以该方案最早的版本内容作为对比基准
    op.execute(
        """
        UPDATE product_governance.plan_suggestion s
        SET base_content_md = v.content_md
        FROM (
            SELECT plan_id, content_md,
                   row_number() OVER (PARTITION BY plan_id ORDER BY version_no ASC) AS rn
            FROM product_governance.plan_version
        ) v
        WHERE v.plan_id = s.plan_id AND v.rn = 1 AND s.base_content_md IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("plan_suggestion", "base_content_md", schema="product_governance")
