import os
import logging
import httpx
import uvicorn
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from data_service import get_all_courses
from web_generate_schedule import run_scheduler

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="College Scheduler API",
    description="Stateless Backend API for optimizing university course schedules.",
    version="1.0.0"
)

# Configure CORS middleware
# In production, restrict allow_origins to your designated frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for seamless local development & testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY")

class ScheduleRequest(BaseModel):
    year: str = "2026"
    semester: str = "B"
    course_ids: List[str]
    exclude_days: Optional[List[str]] = None
    preferred_num_days: Optional[int] = None
    preferred_start_times: Optional[Dict[str, str]] = None
    turnstile_token: Optional[str] = None

def verify_turnstile(token: Optional[str]) -> bool:
    """
    Synchronously verifies the Cloudflare Turnstile token.
    Gracefully skips verification if TURNSTILE_SECRET_KEY is not configured.
    """
    if not TURNSTILE_SECRET_KEY:
        return True
    if not token:
        logger.warning("Turnstile token missing in secure mode.")
        return False

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={"secret": TURNSTILE_SECRET_KEY, "response": token}
            )
            result = resp.json()
            if result.get("success", False):
                return True
            else:
                logger.warning(f"Turnstile verification failed: {result}")
                return False
    except Exception as e:
        logger.error(f"Error during Turnstile verification API call: {e}")
        return False

@app.get("/api/courses", summary="Get distinct available courses")
def get_courses():
    """
    Statelessly retrieves distinct available courses from the upstream database cache.
    """
    try:
        courses = get_all_courses()
        return courses
    except Exception as e:
        logger.error(f"Error fetching courses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {e}"
        )

@app.post("/api/schedule", summary="Generate optimized schedule")
def generate_schedule_endpoint(req: ScheduleRequest):
    """
    Executes the Simulated Annealing engine to generate an optimal schedule.
    Includes Cloudflare Turnstile verification protection.
    """
    # 1. Verify Turnstile token to guard against automated spam
    if not verify_turnstile(req.turnstile_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bot protection verification failed. Please try again."
        )

    # 2. Execute scheduler logic
    try:
        result = run_scheduler(
            year=req.year,
            semester=req.semester,
            course_ids=req.course_ids,
            exclude_days=req.exclude_days,
            preferred_num_days=req.preferred_num_days,
            preferred_start_times=req.preferred_start_times
        )

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing schedule generator: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal scheduler error: {e}"
        )

# Mount static files fallback if present (must be mounted after API routes)
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting production FastAPI server on port {port}...")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
