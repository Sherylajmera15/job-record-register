from fastapi import APIRouter, HTTPException
from database import get_connection, dict_cursor
from models import DashboardStats, DualDashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DualDashboardStats)
def get_dashboard():
    try:
        conn = get_connection()
        cur  = dict_cursor(conn)

        # Stats for the current calendar month (UTC)
        cur.execute("""
            SELECT
                COUNT(*)                       AS total_jobs,
                COALESCE(SUM(final_sheets), 0) AS total_sheets,
                COALESCE(SUM(total_kg),    0)  AS total_kg
            FROM jobs
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        """)
        month_row = dict(cur.fetchone())

        # Overall stats + shared jobs_this_month count
        cur.execute("""
            SELECT
                COUNT(*)                       AS total_jobs,
                COALESCE(SUM(final_sheets), 0) AS total_sheets,
                COALESCE(SUM(total_kg),    0)  AS total_kg,
                SUM(
                    CASE
                        WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
                        THEN 1 ELSE 0
                    END
                )                              AS jobs_this_month
            FROM jobs
        """)
        overall_row = dict(cur.fetchone())
        conn.close()

        jobs_this_month = int(overall_row["jobs_this_month"] or 0)

        return DualDashboardStats(
            month=DashboardStats(
                total_jobs=int(month_row["total_jobs"]),
                total_sheets=int(month_row["total_sheets"]),
                total_kg=round(float(month_row["total_kg"]), 2),
                jobs_this_month=jobs_this_month,
            ),
            overall=DashboardStats(
                total_jobs=int(overall_row["total_jobs"]),
                total_sheets=int(overall_row["total_sheets"]),
                total_kg=round(float(overall_row["total_kg"]), 2),
                jobs_this_month=jobs_this_month,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
