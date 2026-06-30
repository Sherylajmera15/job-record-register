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

    cur.execute("""
        ALTER TABLE jobs ADD COLUMN IF NOT EXISTS
            artworks VARCHAR(500) NOT NULL DEFAULT ''
    """)

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

    # ── UPS redesign columns ──────────────────────────────────────────────────
    cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS printing_type VARCHAR(10)")
    cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS outer_ups     INTEGER")
    cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS inner_ups     INTEGER")
    cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_ups     INTEGER")

    # Migrate existing rows: treat all old records as Outer printing type
    cur.execute("""
        UPDATE jobs
        SET printing_type = 'outer',
            outer_ups     = ups,
            total_ups     = ups
        WHERE total_ups IS NULL
          AND ups        IS NOT NULL
    """)

    cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT ''")

    # ── Partial Entries (draft/incomplete records) ────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS partial_entries (
            id                  SERIAL PRIMARY KEY,
            customer_name       VARCHAR(255),
            job_name            VARCHAR(255),
            artworks            VARCHAR(500)     DEFAULT '',
            length              DOUBLE PRECISION,
            width               DOUBLE PRECISION,
            height              DOUBLE PRECISION,
            gsm                 INTEGER,
            paper_quality       VARCHAR(100),
            order_quantity      INTEGER,
            sheet_length        DOUBLE PRECISION,
            sheet_width         DOUBLE PRECISION,
            ups                 INTEGER,
            base_sheets         INTEGER,
            wastage_percentage  DOUBLE PRECISION,
            final_sheets        INTEGER,
            total_kg            DOUBLE PRECISION,
            notes               TEXT             DEFAULT '',
            created_at          TIMESTAMPTZ      DEFAULT NOW(),
            updated_at          TIMESTAMPTZ      DEFAULT NOW()
        )
    """)

    cur.execute("ALTER TABLE partial_entries ADD COLUMN IF NOT EXISTS printing_type VARCHAR(10)")
    cur.execute("ALTER TABLE partial_entries ADD COLUMN IF NOT EXISTS outer_ups     INTEGER")
    cur.execute("ALTER TABLE partial_entries ADD COLUMN IF NOT EXISTS inner_ups     INTEGER")
    cur.execute("ALTER TABLE partial_entries ADD COLUMN IF NOT EXISTS total_ups     INTEGER")

    # Migrate existing partial rows
    cur.execute("""
        UPDATE partial_entries
        SET printing_type = 'outer',
            outer_ups     = ups,
            total_ups     = ups
        WHERE ups IS NOT NULL
          AND total_ups IS NULL
    """)

    cur.execute("ALTER TABLE partial_entries ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT ''")

    # ── Paper Planned flag ────────────────────────────────────────────────────
    cur.execute(
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS paper_planned BOOLEAN DEFAULT FALSE"
    )

    # ── Repeat Orders ─────────────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS repeat_orders (
            id             SERIAL PRIMARY KEY,
            job_id         INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            order_quantity INTEGER NOT NULL,
            remarks        TEXT    DEFAULT '',
            created_at     TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    conn.commit()
    conn.close()
