from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class JobCreate(BaseModel):
    customer_name: str = Field(..., min_length=1)
    job_name: str = Field(..., min_length=1)
    artworks: str = ""
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    gsm: int = Field(..., gt=0)
    paper_quality: str = Field(..., min_length=1)
    order_quantity: int = Field(..., gt=0)
    sheet_length: float = Field(..., gt=0)
    sheet_width: float = Field(..., gt=0)
    ups: int = Field(..., gt=0)


class JobUpdate(BaseModel):
    customer_name: Optional[str] = None
    job_name: Optional[str] = None
    artworks: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    gsm: Optional[int] = None
    paper_quality: Optional[str] = None
    order_quantity: Optional[int] = None
    sheet_length: Optional[float] = None
    sheet_width: Optional[float] = None
    ups: Optional[int] = None


class JobResponse(BaseModel):
    id: int
    customer_name: str
    job_name: str
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    gsm: int
    paper_quality: str
    order_quantity: int
    sheet_length: float
    sheet_width: float
    ups: int
    base_sheets: int
    wastage_percentage: float
    final_sheets: int
    total_kg: float
    created_at: datetime
    updated_at: datetime
    artworks: str = ""


class DashboardStats(BaseModel):
    total_jobs: int
    total_sheets: int
    total_kg: float
    jobs_this_month: int


class DualDashboardStats(BaseModel):
    month: DashboardStats
    overall: DashboardStats


class CalculationPreview(BaseModel):
    order_quantity: int = Field(..., gt=0)
    ups: int = Field(..., gt=0)
    sheet_length: float = Field(..., gt=0)
    sheet_width: float = Field(..., gt=0)
    gsm: int = Field(..., gt=0)


class CalculationResult(BaseModel):
    base_sheets: int
    wastage_percentage: float
    final_sheets: int
    total_kg: float


class PartialEntryCreate(BaseModel):
    customer_name: Optional[str] = None
    job_name: Optional[str] = None
    artworks: Optional[str] = ""
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    gsm: Optional[int] = None
    paper_quality: Optional[str] = None
    order_quantity: Optional[int] = None
    sheet_length: Optional[float] = None
    sheet_width: Optional[float] = None
    ups: Optional[int] = None
    notes: Optional[str] = ""


class PartialEntryResponse(BaseModel):
    id: int
    customer_name: Optional[str] = None
    job_name: Optional[str] = None
    artworks: Optional[str] = ""
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    gsm: Optional[int] = None
    paper_quality: Optional[str] = None
    order_quantity: Optional[int] = None
    sheet_length: Optional[float] = None
    sheet_width: Optional[float] = None
    ups: Optional[int] = None
    base_sheets: Optional[int] = None
    wastage_percentage: Optional[float] = None
    final_sheets: Optional[int] = None
    total_kg: Optional[float] = None
    notes: Optional[str] = ""
    created_at: datetime
    updated_at: datetime
