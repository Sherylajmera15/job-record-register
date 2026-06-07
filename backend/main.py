import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import jobs, dashboard
print("RUNNING FROM:", __file__)
app = FastAPI(
    title="Shri Neminath Printers & Packaging — Job Record Register API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS origins — set CORS_ORIGINS env var (comma-separated) to include deployed frontend URLs
_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001",
)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


app.include_router(jobs.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Job Record Register API"}
