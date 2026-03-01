from sqlalchemy import Column, String
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_image_url_to_events'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Добавляем колонку image_url в таблицу events
    op.add_column('events', sa.Column('image_url', String, nullable=True))

def downgrade():
    # Удаляем колонку image_url из таблицы events
    op.drop_column('events', 'image_url') 