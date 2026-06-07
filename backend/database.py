import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

print("DATABASE_URL LOADED:", DATABASE_URL)


def get_connection() -> psycopg2.extensions.connection:
    return psycopg2.connect(DATABASE_URL)


def dict_cursor(conn) -> psycopg2.extras.RealDictCursor:
    """Return a cursor that yields rows as plain Python dicts."""
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def init_db() -> None:
    conn = get_connection()
    cur = conn.cursor()

    # ── Create table (fresh installs) ────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id                  SERIAL PRIMARY KEY,
            customer_name       VARCHAR(255)     NOT NULL,
            job_name            VARCHAR(255)     NOT NULL,
            length              DOUBLE PRECISION,
            width               DOUBLE PRECISION,
            height              DOUBLE PRECISION,
            gsm                 INTEGER          NOT NULL,
            paper_quality       VARCHAR(100)     NOT NULL,
            order_quantity      INTEGER          NOT NULL,
            sheet_length        DOUBLE PRECISION NOT NULL,
            sheet_width         DOUBLE PRECISION NOT NULL,
            ups                 INTEGER          NOT NULL,
            base_sheets         INTEGER          NOT NULL,
            wastage_percentage  DOUBLE PRECISION NOT NULL,
            final_sheets        INTEGER          NOT NULL,
            total_kg            DOUBLE PRECISION NOT NULL,
            created_at          TIMESTAMPTZ      DEFAULT NOW(),
            updated_at          TIMESTAMPTZ      DEFAULT NOW(),
            artworks            VARCHAR(500)     NOT NULL DEFAULT ''
        )
    """)

    # ── Migrations (safe to run on every startup) ─────────────────────────────

    # Add artworks column if it was not present in an older schema
    cur.execute("""
        ALTER TABLE jobs ADD COLUMN IF NOT EXISTS
            artworks VARCHAR(500) NOT NULL DEFAULT ''
    """)

    # Make box-dimension columns nullable if they are still NOT NULL
    for col in ("length", "width", "height"):
        cur.execute(f"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name  = 'jobs'
                      AND column_name = '{col}'
                      AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE jobs ALTER COLUMN {col} DROP NOT NULL;
                END IF;
            END $$
        """)

    conn.commit()
    conn.close()
