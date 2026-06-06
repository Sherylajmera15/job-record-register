from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import io
import ssl
import urllib.request
from datetime import datetime

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image as XLImage

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.platypus import Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

from database import get_connection, row_to_dict
from models import JobCreate, JobUpdate, JobResponse, CalculationPreview, CalculationResult
from calculations import calculate_job

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

LOGO_URL = (
    "https://encrypted-tbn0.gstatic.com/images"
    "?q=tbn:ANd9GcRTdaDS48M9wuMBtTT-qCLFNbVV1nI9iWstHPEqdQaIaQ&s"
)

_logo_bytes: Optional[bytes] = None
_logo_loaded = False


def _get_logo() -> Optional[bytes]:
    global _logo_bytes, _logo_loaded
    if _logo_loaded:
        return _logo_bytes
    _logo_loaded = True
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(
            LOGO_URL,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
        )
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            _logo_bytes = resp.read()
    except Exception:
        _logo_bytes = None
    return _logo_bytes


_SEARCH_FILTER = """
    customer_name  LIKE ? OR
    job_name       LIKE ? OR
    artworks       LIKE ? OR
    CAST(length          AS NVARCHAR) LIKE ? OR
    CAST(width           AS NVARCHAR) LIKE ? OR
    CAST(height          AS NVARCHAR) LIKE ? OR
    CAST(gsm             AS NVARCHAR) LIKE ? OR
    paper_quality  LIKE ? OR
    CAST(order_quantity  AS NVARCHAR) LIKE ? OR
    CAST(sheet_length    AS NVARCHAR) LIKE ? OR
    CAST(sheet_width     AS NVARCHAR) LIKE ? OR
    CAST(ups             AS NVARCHAR) LIKE ? OR
    CAST(final_sheets    AS NVARCHAR) LIKE ? OR
    CAST(total_kg        AS NVARCHAR) LIKE ? OR
    CONVERT(NVARCHAR, created_at, 103) LIKE ?
"""

_SORT_MAP = {
    "newest":      "created_at DESC",
    "oldest":      "created_at ASC",
    "customer_az": "customer_name ASC",
    "customer_za": "customer_name DESC",
    "job_az":      "job_name ASC",
    "job_za":      "job_name DESC",
    "order_qty":   "order_quantity DESC",
    "sheets":      "final_sheets DESC",
    "kg":          "total_kg DESC",
}


def _fmt_box(job: dict) -> str:
    parts = [str(job[k]) for k in ("length", "width", "height") if job.get(k) is not None]
    return "×".join(parts) if parts else "—"


def _fetch_jobs(search: Optional[str], sort_by: Optional[str]) -> list[dict]:
    order_clause = _SORT_MAP.get(sort_by or "newest", "created_at DESC")
    conn = get_connection()
    cursor = conn.cursor()
    if search:
        s = f"%{search}%"
        cursor.execute(
            f"SELECT * FROM jobs WHERE {_SEARCH_FILTER} ORDER BY {order_clause}",
            [s] * 15,
        )
    else:
        cursor.execute(f"SELECT * FROM jobs ORDER BY {order_clause}")
    rows = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


# ── calculate preview (no DB) ────────────────────────────────────────────────

@router.post("/calculate", response_model=CalculationResult)
def calculate_preview(data: CalculationPreview):
    return calculate_job(
        order_quantity=data.order_quantity,
        ups=data.ups,
        sheet_length=data.sheet_length,
        sheet_width=data.sheet_width,
        gsm=data.gsm,
    )


# ── company autocomplete ─────────────────────────────────────────────────────

@router.get("/companies", response_model=list[str])
def get_companies():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT DISTINCT customer_name FROM jobs ORDER BY customer_name"
    )
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]


# ── export endpoints (must be before /{job_id}) ───────────────────────────────

@router.get("/export/excel")
def export_excel(search: Optional[str] = Query(None)):
    rows = _fetch_jobs(search, "newest")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Job Records"

    thin = Side(style="thin", color="CBD5E1")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    # ── Logo rows (1–2): leave space for the floating image ──
    logo_bytes = _get_logo()
    logo_row_offset = 0
    if logo_bytes:
        try:
            img = XLImage(io.BytesIO(logo_bytes))
            img.width = 140
            img.height = 70
            ws.add_image(img, "A1")
            ws.row_dimensions[1].height = 40
            ws.row_dimensions[2].height = 36
            logo_row_offset = 2
        except Exception:
            logo_row_offset = 0

    title_row = logo_row_offset + 1
    hdr_row   = logo_row_offset + 2

    # Title row
    last_col_letter = get_column_letter(18)
    ws.merge_cells(f"A{title_row}:{last_col_letter}{title_row}")
    tc = ws.cell(row=title_row, column=1)
    tc.value = "Shri Neminath Printers & Packaging — Job Record Register"
    tc.font = Font(bold=True, size=13, color="FFFFFF")
    tc.fill = PatternFill("solid", fgColor="0F172A")
    tc.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[title_row].height = 32

    headers = [
        "Date Created", "Customer Name", "Job Name", "Artworks",
        "L (cm)", "W (cm)", "H (cm)",
        "GSM", "Paper Quality", "Order Qty",
        "Sheet L (cm)", "Sheet W (cm)", "UPS",
        "Base Sheets", "Wastage %", "Final Sheets", "Total KG",
        "Last Modified",
    ]
    hdr_font  = Font(bold=True, color="FFFFFF", size=10)
    hdr_fill  = PatternFill("solid", fgColor="1E40AF")
    hdr_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for col, h in enumerate(headers, 1):
        c = ws.cell(row=hdr_row, column=col, value=h)
        c.font = hdr_font
        c.fill = hdr_fill
        c.alignment = hdr_align
        c.border = border
    ws.row_dimensions[hdr_row].height = 36

    alt_fill = PatternFill("solid", fgColor="EFF6FF")
    data_start = logo_row_offset + 3
    for ri, job in enumerate(rows, data_start):
        fill = alt_fill if ri % 2 == 0 else None
        vals = [
            job["created_at"].strftime("%d/%m/%Y") if job.get("created_at") else "",
            job["customer_name"],
            job["job_name"],
            job.get("artworks", ""),
            job.get("length", ""),
            job.get("width", ""),
            job.get("height", ""),
            job["gsm"],
            job["paper_quality"],
            job["order_quantity"],
            job["sheet_length"],
            job["sheet_width"],
            job["ups"],
            job["base_sheets"],
            f"{job['wastage_percentage']}%",
            job["final_sheets"],
            job["total_kg"],
            job["updated_at"].strftime("%d/%m/%Y %H:%M") if job.get("updated_at") else "",
        ]
        for col, v in enumerate(vals, 1):
            c = ws.cell(row=ri, column=col, value=v)
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = border
            if fill:
                c.fill = fill

    col_widths = [14, 22, 22, 20, 9, 9, 9, 8, 18, 11, 12, 12, 8, 13, 11, 13, 11, 18]
    for ci, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(ci)].width = w

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    fname = f"job_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/export/pdf")
def export_pdf(search: Optional[str] = Query(None)):
    rows = _fetch_jobs(search, "newest")

    out = io.BytesIO()
    doc = SimpleDocTemplate(
        out,
        pagesize=landscape(A4),
        rightMargin=0.7 * cm, leftMargin=0.7 * cm,
        topMargin=1.5 * cm, bottomMargin=1 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "AppTitle", parent=styles["Heading1"],
        fontSize=13, textColor=colors.HexColor("#0F172A"),
        spaceAfter=2, alignment=1,
    )
    sub_style = ParagraphStyle(
        "Sub", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#64748B"),
        spaceAfter=10, alignment=1,
    )

    elements = []

    # ── Header: logo left, title right ───────────────────────────────────────
    logo_bytes = _get_logo()
    title_para = Paragraph("Shri Neminath Printers &amp; Packaging", title_style)
    sub_para   = Paragraph(
        f"Job Record Register &nbsp;|&nbsp; Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        f" &nbsp;|&nbsp; Total Records: {len(rows)}",
        sub_style,
    )

    if logo_bytes:
        try:
            logo_img = RLImage(io.BytesIO(logo_bytes))
            logo_img._restrictSize(3 * cm, 2 * cm)
            header_data = [[logo_img, [title_para, sub_para]]]
            header_tbl = Table(header_data, colWidths=[3.5 * cm, None])
            header_tbl.setStyle(TableStyle([
                ("VALIGN",   (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING",  (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 8),
                ("LEFTPADDING",  (1, 0), (1, 0), 8),
            ]))
            elements.append(header_tbl)
        except Exception:
            elements += [title_para, sub_para]
    else:
        elements += [title_para, sub_para]

    # ── Data table ────────────────────────────────────────────────────────────
    tbl_data = [[
        "Date", "Customer", "Job Name", "Artworks", "Box (L×W×H)", "GSM",
        "Quality", "Qty", "Sheet (L×W)", "UPS", "Sheets", "KG",
    ]]
    for job in rows:
        tbl_data.append([
            job["created_at"].strftime("%d/%m/%y") if job.get("created_at") else "",
            job["customer_name"],
            job["job_name"],
            job.get("artworks", ""),
            _fmt_box(job),
            str(job["gsm"]),
            job["paper_quality"],
            str(job["order_quantity"]),
            f"{job['sheet_length']}×{job['sheet_width']}",
            str(job["ups"]),
            str(job["final_sheets"]),
            str(job["total_kg"]),
        ])

    col_w = [1.8*cm, 3.2*cm, 3.2*cm, 3*cm, 3*cm, 1.3*cm, 2.8*cm, 1.8*cm, 2.5*cm, 1.3*cm, 2.2*cm, 1.8*cm]
    tbl = Table(tbl_data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#1E40AF")),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 7),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#EFF6FF")]),
        ("FONTSIZE",      (0, 1), (-1, -1), 6.5),
        ("GRID",          (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(tbl)
    doc.build(elements)
    out.seek(0)

    fname = f"job_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        out,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[JobResponse])
def get_jobs(
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("newest"),
):
    try:
        rows = _fetch_jobs(search, sort_by)
        return [JobResponse(**r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=JobResponse, status_code=201)
def create_job(job: JobCreate):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        calc = calculate_job(
            order_quantity=job.order_quantity,
            ups=job.ups,
            sheet_length=job.sheet_length,
            sheet_width=job.sheet_width,
            gsm=job.gsm,
        )

        cursor.execute("""
            INSERT INTO jobs (
                customer_name, job_name, artworks,
                length, width, height,
                gsm, paper_quality,
                order_quantity, sheet_length, sheet_width, ups,
                base_sheets, wastage_percentage, final_sheets, total_kg
            ) OUTPUT INSERTED.*
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            job.customer_name, job.job_name, job.artworks,
            job.length, job.width, job.height,
            job.gsm, job.paper_quality,
            job.order_quantity,
            job.sheet_length, job.sheet_width,
            job.ups,
            calc["base_sheets"], calc["wastage_percentage"],
            calc["final_sheets"], calc["total_kg"],
        ])
        row = cursor.fetchone()
        conn.commit()
        return JobResponse(**row_to_dict(row))
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id = ?", [job_id])
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobResponse(**row_to_dict(row))


@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job: JobUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM jobs WHERE id = ?", [job_id])
        existing_row = cursor.fetchone()
        if not existing_row:
            raise HTTPException(status_code=404, detail="Job not found.")

        ex = row_to_dict(existing_row)

        # Merge incoming fields over existing
        merged = {
            "customer_name":  job.customer_name  if job.customer_name  is not None else ex["customer_name"],
            "job_name":       job.job_name        if job.job_name       is not None else ex["job_name"],
            "artworks":       job.artworks        if job.artworks       is not None else ex["artworks"],
            "length":         job.length          if job.length         is not None else ex["length"],
            "width":          job.width           if job.width          is not None else ex["width"],
            "height":         job.height          if job.height         is not None else ex["height"],
            "gsm":            job.gsm             if job.gsm            is not None else ex["gsm"],
            "paper_quality":  job.paper_quality   if job.paper_quality  is not None else ex["paper_quality"],
            "order_quantity": job.order_quantity  if job.order_quantity is not None else ex["order_quantity"],
            "sheet_length":   job.sheet_length    if job.sheet_length   is not None else ex["sheet_length"],
            "sheet_width":    job.sheet_width     if job.sheet_width    is not None else ex["sheet_width"],
            "ups":            job.ups             if job.ups            is not None else ex["ups"],
        }

        calc = calculate_job(
            order_quantity=merged["order_quantity"],
            ups=merged["ups"],
            sheet_length=merged["sheet_length"],
            sheet_width=merged["sheet_width"],
            gsm=merged["gsm"],
        )

        cursor.execute("""
            UPDATE jobs SET
                customer_name      = ?,
                job_name           = ?,
                artworks           = ?,
                length             = ?,
                width              = ?,
                height             = ?,
                gsm                = ?,
                paper_quality      = ?,
                order_quantity     = ?,
                sheet_length       = ?,
                sheet_width        = ?,
                ups                = ?,
                base_sheets        = ?,
                wastage_percentage = ?,
                final_sheets       = ?,
                total_kg           = ?,
                updated_at         = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = ?
        """, [
            merged["customer_name"], merged["job_name"], merged["artworks"],
            merged["length"], merged["width"], merged["height"],
            merged["gsm"], merged["paper_quality"],
            merged["order_quantity"],
            merged["sheet_length"], merged["sheet_width"],
            merged["ups"],
            calc["base_sheets"], calc["wastage_percentage"],
            calc["final_sheets"], calc["total_kg"],
            job_id,
        ])
        row = cursor.fetchone()
        conn.commit()
        return JobResponse(**row_to_dict(row))
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM jobs WHERE id = ?", [job_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Job not found.")
        cursor.execute("DELETE FROM jobs WHERE id = ?", [job_id])
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
