from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_connection, dict_cursor
from models import PartialEntryCreate, PartialEntryResponse, JobCreate, JobResponse
from calculations import calculate_job

router = APIRouter(prefix="/api/partial-entries", tags=["partials"])


def _resolve_ups(printing_type: Optional[str], outer_ups: Optional[int], inner_ups: Optional[int]) -> int:
    pt = (printing_type or "outer").lower()
    if pt == "inner":
        return int(inner_ups or 0)
    elif pt == "both":
        return int(outer_ups or 0) + int(inner_ups or 0)
    return int(outer_ups or 0)


def _try_compute(data: PartialEntryCreate) -> dict:
    total_ups = _resolve_ups(data.printing_type, data.outer_ups, data.inner_ups)
    if all([data.order_quantity, total_ups, data.sheet_length, data.sheet_width, data.gsm]):
        try:
            return calculate_job(
                order_quantity=data.order_quantity,
                ups=total_ups,
                sheet_length=data.sheet_length,
                sheet_width=data.sheet_width,
                gsm=data.gsm,
            )
        except Exception:
            pass
    return {"base_sheets": None, "wastage_percentage": None, "final_sheets": None, "total_kg": None}


@router.get("", response_model=list[PartialEntryResponse])
def list_partials(search: Optional[str] = Query(None)):
    conn = get_connection()
    cur  = dict_cursor(conn)
    if search:
        s = f"%{search}%"
        cur.execute("""
            SELECT * FROM partial_entries
            WHERE
                customer_name ILIKE %s OR
                job_name      ILIKE %s OR
                artworks      ILIKE %s OR
                paper_quality ILIKE %s OR
                CAST(gsm AS TEXT) ILIKE %s OR
                notes         ILIKE %s
            ORDER BY created_at DESC
        """, [s] * 6)
    else:
        cur.execute("SELECT * FROM partial_entries ORDER BY created_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return [PartialEntryResponse(**r) for r in rows]


@router.post("", response_model=PartialEntryResponse, status_code=201)
def create_partial(data: PartialEntryCreate):
    calc = _try_compute(data)
    total_ups = _resolve_ups(data.printing_type, data.outer_ups, data.inner_ups)
    conn = get_connection()
    cur  = dict_cursor(conn)
    try:
        cur.execute("""
            INSERT INTO partial_entries (
                customer_name, job_name, artworks,
                length, width, height,
                gsm, paper_quality,
                order_quantity, sheet_length, sheet_width,
                ups, printing_type, outer_ups, inner_ups, total_ups,
                base_sheets, wastage_percentage, final_sheets, total_kg,
                notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, [
            data.customer_name, data.job_name, data.artworks or "",
            data.length, data.width, data.height,
            data.gsm, data.paper_quality,
            data.order_quantity, data.sheet_length, data.sheet_width,
            total_ups or None,
            data.printing_type, data.outer_ups, data.inner_ups, total_ups or None,
            calc["base_sheets"], calc["wastage_percentage"], calc["final_sheets"], calc["total_kg"],
            data.notes or "",
        ])
        row = dict(cur.fetchone())
        conn.commit()
        return PartialEntryResponse(**row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/{entry_id}", response_model=PartialEntryResponse)
def update_partial(entry_id: int, data: PartialEntryCreate):
    calc = _try_compute(data)
    total_ups = _resolve_ups(data.printing_type, data.outer_ups, data.inner_ups)
    conn = get_connection()
    cur  = dict_cursor(conn)
    try:
        cur.execute("SELECT id FROM partial_entries WHERE id = %s", [entry_id])
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Partial entry not found.")
        cur.execute("""
            UPDATE partial_entries SET
                customer_name      = %s,
                job_name           = %s,
                artworks           = %s,
                length             = %s,
                width              = %s,
                height             = %s,
                gsm                = %s,
                paper_quality      = %s,
                order_quantity     = %s,
                sheet_length       = %s,
                sheet_width        = %s,
                ups                = %s,
                printing_type      = %s,
                outer_ups          = %s,
                inner_ups          = %s,
                total_ups          = %s,
                base_sheets        = %s,
                wastage_percentage = %s,
                final_sheets       = %s,
                total_kg           = %s,
                notes              = %s,
                updated_at         = NOW()
            WHERE id = %s
            RETURNING *
        """, [
            data.customer_name, data.job_name, data.artworks or "",
            data.length, data.width, data.height,
            data.gsm, data.paper_quality,
            data.order_quantity, data.sheet_length, data.sheet_width,
            total_ups or None,
            data.printing_type, data.outer_ups, data.inner_ups, total_ups or None,
            calc["base_sheets"], calc["wastage_percentage"], calc["final_sheets"], calc["total_kg"],
            data.notes or "",
            entry_id,
        ])
        row = dict(cur.fetchone())
        conn.commit()
        return PartialEntryResponse(**row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/{entry_id}", status_code=204)
def delete_partial(entry_id: int):
    conn = get_connection()
    cur  = conn.cursor()
    try:
        cur.execute("SELECT id FROM partial_entries WHERE id = %s", [entry_id])
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Partial entry not found.")
        cur.execute("DELETE FROM partial_entries WHERE id = %s", [entry_id])
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/{entry_id}/complete", response_model=JobResponse, status_code=201)
def complete_partial(entry_id: int, job_data: JobCreate):
    if job_data.outer_ups is None and job_data.inner_ups is None and job_data.ups is not None:
        total_ups = job_data.ups
    else:
        total_ups = _resolve_ups(job_data.printing_type, job_data.outer_ups, job_data.inner_ups)
    if total_ups <= 0:
        raise HTTPException(status_code=422, detail="UPS must be greater than 0.")

    conn = get_connection()
    cur  = dict_cursor(conn)
    try:
        cur.execute("SELECT id FROM partial_entries WHERE id = %s", [entry_id])
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Partial entry not found.")

        calc = calculate_job(
            order_quantity=job_data.order_quantity,
            ups=total_ups,
            sheet_length=job_data.sheet_length,
            sheet_width=job_data.sheet_width,
            gsm=job_data.gsm,
        )

        cur.execute("""
            INSERT INTO jobs (
                customer_name, job_name, artworks,
                length, width, height,
                gsm, paper_quality,
                order_quantity, sheet_length, sheet_width,
                ups, printing_type, outer_ups, inner_ups, total_ups,
                base_sheets, wastage_percentage, final_sheets, total_kg
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, [
            job_data.customer_name, job_data.job_name, job_data.artworks or "",
            job_data.length, job_data.width, job_data.height,
            job_data.gsm, job_data.paper_quality,
            job_data.order_quantity, job_data.sheet_length, job_data.sheet_width,
            total_ups, job_data.printing_type, job_data.outer_ups, job_data.inner_ups, total_ups,
            calc["base_sheets"], calc["wastage_percentage"], calc["final_sheets"], calc["total_kg"],
        ])
        row = dict(cur.fetchone())
        cur.execute("DELETE FROM partial_entries WHERE id = %s", [entry_id])
        conn.commit()
        return JobResponse(**row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
