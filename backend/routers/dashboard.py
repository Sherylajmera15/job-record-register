from fastapi import APIRouter, HTTPException
from database import get_connection
from models import DashboardStats, DualDashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DualDashboardStats)
def get_dashboard():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Stats for the current calendar month only
        cursor.execute("""
            SELECT
                COUNT(*)                     AS total_jobs,
                ISNULL(SUM(final_sheets), 0) AS total_sheets,
                ISNULL(SUM(total_kg), 0)     AS total_kg
            FROM jobs
            WHERE MONTH(created_at) = MONTH(GETDATE())
              AND YEAR(created_at)  = YEAR(GETDATE())
        """)
        month_row = cursor.fetchone()

        # Overall stats (all time) + jobs_this_month for the shared card
        cursor.execute("""
            SELECT
                COUNT(*)                     AS total_jobs,
                ISNULL(SUM(final_sheets), 0) AS total_sheets,
                ISNULL(SUM(total_kg), 0)     AS total_kg,
                SUM(
                    CASE
                        WHEN MONTH(created_at) = MONTH(GETDATE())
                         AND YEAR(created_at)  = YEAR(GETDATE())
                        THEN 1 ELSE 0
                    END
                )                            AS jobs_this_month
            FROM jobs
        """)
        overall_row = cursor.fetchone()
        conn.close()

        jobs_this_month = int(overall_row[3])

        return DualDashboardStats(
            month=DashboardStats(
                total_jobs=int(month_row[0]),
                total_sheets=int(month_row[1]),
                total_kg=round(float(month_row[2]), 2),
                jobs_this_month=jobs_this_month,
            ),
            overall=DashboardStats(
                total_jobs=int(overall_row[0]),
                total_sheets=int(overall_row[1]),
                total_kg=round(float(overall_row[2]), 2),
                jobs_this_month=jobs_this_month,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
