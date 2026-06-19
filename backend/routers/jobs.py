from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import io
import os
from datetime import datetime, date

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image as XLImage

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.platypus import Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

from database import get_connection, dict_cursor
from models import JobCreate, JobUpdate, JobResponse, CalculationPreview, CalculationResult
from calculations import calculate_job

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# ── Logo (transparent PNG bundled with the backend, cached in memory) ─────────

LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "logo.png")
_logo_bytes: Optional[bytes] = None
_logo_loaded = False


def _get_logo() -> Optional[bytes]:
    global _logo_bytes, _logo_loaded
    if _logo_loaded:
        return _logo_bytes
    _logo_loaded = True
    try:
        with open(LOGO_PATH, "rb") as f:
            _logo_bytes = f.read()
    except Exception:
        _logo_bytes = None
    return _logo_bytes


# ── Search / sort helpers ─────────────────────────────────────────────────────

# PostgreSQL: use %s placeholders and ILIKE for case-insensitive matching.
# CAST(nullable_col AS TEXT) ILIKE %s  →  returns NULL (not TRUE) when col IS NULL,
# which is the correct "no match" behaviour.
_SEARCH_FILTER = """
    customer_name                      ILIKE %s OR
    job_name                           ILIKE %s OR
    artworks                           ILIKE %s OR
    CAST(length          AS TEXT)      ILIKE %s OR
    CAST(width           AS TEXT)      ILIKE %s OR
    CAST(height          AS TEXT)      ILIKE %s OR
    CAST(gsm             AS TEXT)      ILIKE %s OR
    paper_quality                      ILIKE %s OR
    CAST(order_quantity  AS TEXT)      ILIKE %s OR
    CAST(sheet_length    AS TEXT)      ILIKE %s OR
    CAST(sheet_width     AS TEXT)      ILIKE %s OR
    CAST(ups             AS TEXT)      ILIKE %s OR
    CAST(final_sheets    AS TEXT)      ILIKE %s OR
    CAST(total_kg        AS TEXT)      ILIKE %s OR
    TO_CHAR(created_at, 'DD/MM/YYYY') ILIKE %s
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


def _parse_date(label: str, value: Optional[str]) -> Optional[date]:
    """Parse a 'YYYY-MM-DD' query param, raising 400 on bad input."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {label}: expected YYYY-MM-DD")


def _fetch_jobs(
    search: Optional[str],
    sort_by: Optional[str],
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> list[dict]:
    order_clause = _SORT_MAP.get(sort_by or "newest", "created_at DESC")
    conn = get_connection()
    cur  = dict_cursor(conn)

    conditions: list[str] = []
    params: list = []

    if search:
        conditions.append(f"({_SEARCH_FILTER})")
        params.extend([f"%{search}%"] * 15)

    if from_date and to_date:
        # Filter on the existing created_at field, by calendar day.
        conditions.append("created_at::date BETWEEN %s AND %s")
        params.extend([from_date, to_date])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    cur.execute(f"SELECT * FROM jobs {where_clause} ORDER BY {order_clause}", params)

    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


# ── Calculation preview (no DB) ───────────────────────────────────────────────

@router.post("/calculate", response_model=CalculationResult)
def calculate_preview(data: CalculationPreview):
    return calculate_job(
        order_quantity=data.order_quantity,
        ups=data.ups,
        sheet_length=data.sheet_length,
        sheet_width=data.sheet_width,
        gsm=data.gsm,
    )


# ── Company autocomplete ──────────────────────────────────────────────────────

@router.get("/companies", response_model=list[str])
def get_companies():
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT DISTINCT customer_name FROM jobs ORDER BY customer_name")
    rows = cur.fetchall()
    conn.close()
    return [r[0] for r in rows]


# ── GSM autocomplete (distinct values from completed jobs) ────────────────────

@router.get("/gsm-values", response_model=list[int])
def get_gsm_values():
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT DISTINCT gsm FROM jobs WHERE gsm IS NOT NULL ORDER BY gsm")
    rows = cur.fetchall()
    conn.close()
    return [r[0] for r in rows]


# ── Export endpoints (must come before /{job_id}) ─────────────────────────────

@router.get("/export/excel")
def export_excel(
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD — start of created_at range"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD — end of created_at range"),
):
    rows = _fetch_jobs(search, "newest", _parse_date("from_date", from_date), _parse_date("to_date", to_date))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Job Records"

    thin   = Side(style="thin", color="CBD5E1")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    # Logo (rows 1–2)
    logo_bytes     = _get_logo()
    logo_row_offset = 0
    if logo_bytes:
        try:
            img        = XLImage(io.BytesIO(logo_bytes))
            img.width  = 140
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
    last_col = get_column_letter(18)
    ws.merge_cells(f"A{title_row}:{last_col}{title_row}")
    tc           = ws.cell(row=title_row, column=1)
    tc.value     = "Shri Neminath Printers & Packaging — Job Record Register"
    tc.font      = Font(bold=True, size=13, color="FFFFFF")
    tc.fill      = PatternFill("solid", fgColor="0F172A")
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
        c           = ws.cell(row=hdr_row, column=col, value=h)
        c.font      = hdr_font
        c.fill      = hdr_fill
        c.alignment = hdr_align
        c.border    = border
    ws.row_dimensions[hdr_row].height = 36

    alt_fill   = PatternFill("solid", fgColor="EFF6FF")
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
            c           = ws.cell(row=ri, column=col, value=v)
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border    = border
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
def export_pdf(
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD — start of created_at range"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD — end of created_at range"),
):
    rows = _fetch_jobs(search, "newest", _parse_date("from_date", from_date), _parse_date("to_date", to_date))

    out = io.BytesIO()
    doc = SimpleDocTemplate(
        out,
        pagesize=landscape(A4),
        rightMargin=0.7 * cm, leftMargin=0.7 * cm,
        topMargin=1.5 * cm,  bottomMargin=1 * cm,
    )
    styles     = getSampleStyleSheet()
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

    elements   = []
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
            header_tbl  = Table(header_data, colWidths=[3.5 * cm, None])
            header_tbl.setStyle(TableStyle([
                ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING",  (0, 0), (0, 0),  0),
                ("RIGHTPADDING", (0, 0), (0, 0),  8),
                ("LEFTPADDING",  (1, 0), (1, 0),  8),
            ]))
            elements.append(header_tbl)
        except Exception:
            elements += [title_para, sub_para]
    else:
        elements += [title_para, sub_para]

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
    tbl   = Table(tbl_data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0),  colors.HexColor("#1E40AF")),
        ("TEXTCOLOR",      (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",       (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",       (0, 0), (-1, 0),  7),
        ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EFF6FF")]),
        ("FONTSIZE",       (0, 1), (-1, -1), 6.5),
        ("GRID",           (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",     (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 3),
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


# ── Supplier export helpers ───────────────────────────────────────────────────

def _fetch_jobs_by_ids(job_ids: list[int]) -> list[dict]:
    if not job_ids:
        return []
    conn = get_connection()
    cur  = dict_cursor(conn)
    placeholders = ",".join(["%s"] * len(job_ids))
    cur.execute(
        f"SELECT * FROM jobs WHERE id IN ({placeholders}) ORDER BY created_at DESC",
        job_ids,
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@router.get("/export/supplier/excel")
def export_supplier_excel(ids: str = Query(..., description="Comma-separated job IDs")):
    try:
        job_ids = [int(i.strip()) for i in ids.split(",") if i.strip().isdigit()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job IDs.")
    if not job_ids:
        raise HTTPException(status_code=400, detail="No valid job IDs provided.")

    rows = _fetch_jobs_by_ids(job_ids)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Supplier Sheet"

    thin   = Side(style="thin", color="CBD5E1")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    logo_bytes      = _get_logo()
    logo_row_offset = 0
    if logo_bytes:
        try:
            img        = XLImage(io.BytesIO(logo_bytes))
            img.width  = 100
            img.height = 50
            ws.add_image(img, "A1")
            ws.row_dimensions[1].height = 30
            ws.row_dimensions[2].height = 26
            logo_row_offset = 2
        except Exception:
            logo_row_offset = 0

    title_row  = logo_row_offset + 1
    sub_row    = logo_row_offset + 2
    hdr_row    = logo_row_offset + 3
    data_start = hdr_row + 1

    last_col = get_column_letter(7)
    ws.merge_cells(f"A{title_row}:{last_col}{title_row}")
    tc           = ws.cell(row=title_row, column=1)
    tc.value     = "Shri Neminath Printers & Packaging — Supplier Paper Requirement Sheet"
    tc.font      = Font(bold=True, size=12, color="FFFFFF")
    tc.fill      = PatternFill("solid", fgColor="0F172A")
    tc.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[title_row].height = 28

    ws.merge_cells(f"A{sub_row}:{last_col}{sub_row}")
    sc           = ws.cell(row=sub_row, column=1)
    sc.value     = f"Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}  |  Records: {len(rows)}"
    sc.font      = Font(size=9, color="94A3B8")
    sc.fill      = PatternFill("solid", fgColor="0F172A")
    sc.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[sub_row].height = 18

    headers   = ["#", "Paper Quality", "GSM", "Sheet Length (cm)", "Sheet Width (cm)", "Final Sheets", "Total KG"]
    hdr_font  = Font(bold=True, color="FFFFFF", size=10)
    hdr_fill  = PatternFill("solid", fgColor="1E40AF")
    hdr_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for col, h in enumerate(headers, 1):
        c           = ws.cell(row=hdr_row, column=col, value=h)
        c.font      = hdr_font
        c.fill      = hdr_fill
        c.alignment = hdr_align
        c.border    = border
    ws.row_dimensions[hdr_row].height = 32

    alt_fill = PatternFill("solid", fgColor="EFF6FF")
    for i, job in enumerate(rows):
        ri   = data_start + i
        fill = alt_fill if ri % 2 == 0 else None
        vals = [i + 1, job["paper_quality"], job["gsm"], job["sheet_length"], job["sheet_width"], job["final_sheets"], job["total_kg"]]
        for col, v in enumerate(vals, 1):
            c           = ws.cell(row=ri, column=col, value=v)
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border    = border
            if fill:
                c.fill = fill

    for ci, w in enumerate([5, 22, 9, 18, 18, 16, 12], 1):
        ws.column_dimensions[get_column_letter(ci)].width = w

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    fname = f"supplier_sheet_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/export/supplier/pdf")
def export_supplier_pdf(ids: str = Query(..., description="Comma-separated job IDs")):
    try:
        job_ids = [int(i.strip()) for i in ids.split(",") if i.strip().isdigit()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job IDs.")
    if not job_ids:
        raise HTTPException(status_code=400, detail="No valid job IDs provided.")

    rows = _fetch_jobs_by_ids(job_ids)

    out = io.BytesIO()
    doc = SimpleDocTemplate(
        out,
        pagesize=A4,
        rightMargin=1 * cm, leftMargin=1 * cm,
        topMargin=1.5 * cm, bottomMargin=1 * cm,
    )
    styles      = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SupTitle", parent=styles["Heading1"],
        fontSize=12, textColor=colors.HexColor("#0F172A"),
        spaceAfter=2, alignment=1,
    )
    sub_style = ParagraphStyle(
        "SupSub", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#64748B"),
        spaceAfter=10, alignment=1,
    )

    elements   = []
    logo_bytes = _get_logo()
    title_para = Paragraph("Shri Neminath Printers &amp; Packaging", title_style)
    sub_para   = Paragraph(
        f"Supplier Paper Requirement Sheet &nbsp;|&nbsp; "
        f"Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        f" &nbsp;|&nbsp; Records: {len(rows)}",
        sub_style,
    )

    if logo_bytes:
        try:
            logo_img = RLImage(io.BytesIO(logo_bytes))
            logo_img._restrictSize(2.5 * cm, 1.8 * cm)
            header_data = [[logo_img, [title_para, sub_para]]]
            header_tbl  = Table(header_data, colWidths=[3 * cm, None])
            header_tbl.setStyle(TableStyle([
                ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING",  (0, 0), (0, 0),  0),
                ("RIGHTPADDING", (0, 0), (0, 0),  8),
                ("LEFTPADDING",  (1, 0), (1, 0),  8),
            ]))
            elements.append(header_tbl)
        except Exception:
            elements += [title_para, sub_para]
    else:
        elements += [title_para, sub_para]

    tbl_data = [["#", "Paper Quality", "GSM", "Sheet L (cm)", "Sheet W (cm)", "Final Sheets", "Total KG"]]
    for i, job in enumerate(rows, 1):
        tbl_data.append([
            str(i),
            job["paper_quality"],
            str(job["gsm"]),
            str(job["sheet_length"]),
            str(job["sheet_width"]),
            str(job["final_sheets"]),
            str(job["total_kg"]),
        ])

    col_w = [1 * cm, 4.5 * cm, 2 * cm, 2.5 * cm, 2.5 * cm, 3 * cm, 2.5 * cm]
    tbl   = Table(tbl_data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0),  colors.HexColor("#1E40AF")),
        ("TEXTCOLOR",      (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",       (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",       (0, 0), (-1, 0),  8),
        ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EFF6FF")]),
        ("FONTSIZE",       (0, 1), (-1, -1), 8),
        ("GRID",           (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",     (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 4),
    ]))
    elements.append(tbl)
    doc.build(elements)
    out.seek(0)

    fname = f"supplier_sheet_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        out,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[JobResponse])
def get_jobs(
    search:  Optional[str] = Query(None),
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
    cur  = dict_cursor(conn)
    try:
        calc = calculate_job(
            order_quantity=job.order_quantity,
            ups=job.ups,
            sheet_length=job.sheet_length,
            sheet_width=job.sheet_width,
            gsm=job.gsm,
        )

        cur.execute("""
            INSERT INTO jobs (
                customer_name, job_name, artworks,
                length, width, height,
                gsm, paper_quality,
                order_quantity, sheet_length, sheet_width, ups,
                base_sheets, wastage_percentage, final_sheets, total_kg
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
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
        row = dict(cur.fetchone())
        conn.commit()
        return JobResponse(**row)
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
    cur  = dict_cursor(conn)
    cur.execute("SELECT * FROM jobs WHERE id = %s", [job_id])
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobResponse(**dict(row))


@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job: JobUpdate):
    conn = get_connection()
    cur  = dict_cursor(conn)
    try:
        cur.execute("SELECT * FROM jobs WHERE id = %s", [job_id])
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Job not found.")

        ex = dict(existing)

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

        cur.execute("""
            UPDATE jobs SET
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
                base_sheets        = %s,
                wastage_percentage = %s,
                final_sheets       = %s,
                total_kg           = %s,
                updated_at         = NOW()
            WHERE id = %s
            RETURNING *
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
        row = dict(cur.fetchone())
        conn.commit()
        return JobResponse(**row)
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
    cur  = conn.cursor()
    try:
        cur.execute("SELECT id FROM jobs WHERE id = %s", [job_id])
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Job not found.")
        cur.execute("DELETE FROM jobs WHERE id = %s", [job_id])
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
