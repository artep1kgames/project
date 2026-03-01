"""add image_url to events

Revision ID: add_image_url
Revises: 
Create Date: 2024-03-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_image_url'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Добавляем колонку image_url в таблицу events
    op.add_column('events', sa.Column('image_url', sa.String(), nullable=True))

def downgrade():
    # Удаляем колонку image_url из таблицы events
    op.drop_column('events', 'image_url') 