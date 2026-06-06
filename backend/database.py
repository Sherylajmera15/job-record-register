import pyodbc
import os
from dotenv import load_dotenv

load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", r"LAPTOP-JMFS92LT\SQLEXPRESS")
DB_NAME = os.getenv("DB_NAME", "JobRecord")
DB_USER = os.getenv("DB_USER", "sheryl")
DB_PASSWORD = os.getenv("DB_PASSWORD", "sherylajmera11")
_trust_raw = os.getenv("DB_TRUST_CERT", "true")
DB_TRUST_CERT = "yes" if _trust_raw.lower() in ("true", "yes", "1") else "no"


def get_connection() -> pyodbc.Connection:
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        f"TrustServerCertificate={DB_TRUST_CERT};"
    )
    return pyodbc.connect(conn_str)


def init_db() -> None:
    conn = get_connection()
    cursor = conn.cursor()

    # Create table for fresh installs (includes artworks, nullable box dims, no uniqueness constraint)
    cursor.execute("""
        IF NOT EXISTS (
            SELECT * FROM sysobjects WHERE name='jobs' AND xtype='U'
        )
        CREATE TABLE jobs (
            id                  INT IDENTITY(1,1) PRIMARY KEY,
            customer_name       NVARCHAR(255) NOT NULL,
            job_name            NVARCHAR(255) NOT NULL,
            length              FLOAT NULL,
            width               FLOAT NULL,
            height              FLOAT NULL,
            gsm                 INT NOT NULL,
            paper_quality       NVARCHAR(100) NOT NULL,
            order_quantity      INT NOT NULL,
            sheet_length        FLOAT NOT NULL,
            sheet_width         FLOAT NOT NULL,
            ups                 INT NOT NULL,
            base_sheets         INT NOT NULL,
            wastage_percentage  FLOAT NOT NULL,
            final_sheets        INT NOT NULL,
            total_kg            FLOAT NOT NULL,
            created_at          DATETIME DEFAULT GETDATE(),
            updated_at          DATETIME DEFAULT GETDATE(),
            artworks            NVARCHAR(500) NOT NULL DEFAULT ''
        )
    """)
    conn.commit()

    # --- Migrations for existing tables ---

    # 1. Add artworks column if it doesn't exist yet
    cursor.execute("""
        IF NOT EXISTS (
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID('jobs') AND name = 'artworks'
        )
        ALTER TABLE jobs ADD artworks NVARCHAR(500) NOT NULL DEFAULT ''
    """)
    conn.commit()

    # 2. Make length nullable
    cursor.execute("""
        IF EXISTS (
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID('jobs') AND name = 'length'
              AND is_nullable = 0
        )
        ALTER TABLE jobs ALTER COLUMN length FLOAT NULL
    """)
    conn.commit()

    # 3. Make width nullable
    cursor.execute("""
        IF EXISTS (
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID('jobs') AND name = 'width'
              AND is_nullable = 0
        )
        ALTER TABLE jobs ALTER COLUMN width FLOAT NULL
    """)
    conn.commit()

    # 4. Make height nullable
    cursor.execute("""
        IF EXISTS (
            SELECT * FROM sys.columns
            WHERE object_id = OBJECT_ID('jobs') AND name = 'height'
              AND is_nullable = 0
        )
        ALTER TABLE jobs ALTER COLUMN height FLOAT NULL
    """)
    conn.commit()

    # 5. Drop old unique constraint (customer + job only) if it exists
    cursor.execute("""
        IF EXISTS (
            SELECT * FROM sys.key_constraints
            WHERE name = 'UQ_customer_job' AND parent_object_id = OBJECT_ID('jobs')
        )
        ALTER TABLE jobs DROP CONSTRAINT UQ_customer_job
    """)
    conn.commit()

    # 6. Drop UQ_customer_job_artworks if it was created by a previous version
    cursor.execute("""
        IF EXISTS (
            SELECT * FROM sys.key_constraints
            WHERE name = 'UQ_customer_job_artworks' AND parent_object_id = OBJECT_ID('jobs')
        )
        ALTER TABLE jobs DROP CONSTRAINT UQ_customer_job_artworks
    """)
    conn.commit()
    conn.close()


# Column order must match the physical column order in the DB.
# For existing tables: artworks was added via ALTER TABLE, so it sits at the end (index 18).
# For fresh installs: the CREATE TABLE above defines the same physical order.
JOB_COLUMNS = [
    "id", "customer_name", "job_name", "length", "width", "height",
    "gsm", "paper_quality", "order_quantity", "sheet_length", "sheet_width",
    "ups", "base_sheets", "wastage_percentage", "final_sheets", "total_kg",
    "created_at", "updated_at", "artworks",
]


def row_to_dict(row) -> dict:
    return dict(zip(JOB_COLUMNS, row))
