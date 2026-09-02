import os
import io
import json
import hmac
import hashlib
import secrets
import time
import logging
import httpx
import uvicorn
import pypdf
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from data_service import get_all_courses
from web_generate_schedule import run_scheduler

from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)
load_dotenv()

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
BRAUDE_MCP_URL = os.environ.get("BRAUDE_MCP_URL", "https://braude-mcp.oshri-mcp.workers.dev/mcp")
CLEARANCE_TTL_SECONDS = 8 * 3600

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

MCP_TOOL_DECLARATIONS = [
    {
        "name": "get_academic_calendar",
        "description": "Fetches and parses the academic calendar from Ort Braude College (semester start/end, exam periods, holidays).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "year": {
                    "type": "STRING",
                    "description": 'Optional academic year string (e.g. 2024-2025 or תשפ"ה)'
                }
            }
        }
    },
    {
        "name": "search_courses",
        "description": "Searches for courses in Braude public schedule system by keyword, course code, or department name.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {
                    "type": "STRING",
                    "description": 'Search keyword or course code (e.g., אלגברה or 61101)'
                },
                "department": {
                    "type": "STRING",
                    "description": "Optional department filter name"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_course_schedule",
        "description": "Retrieves detailed schedule info for a course, including lectures, labs, instructors, time slots, classrooms, and syllabus URL.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "courseCode": {
                    "type": "STRING",
                    "description": 'Unique course code (e.g., 61101)'
                }
            },
            "required": ["courseCode"]
        }
    },
    {
        "name": "scan_syllabus_pdf",
        "description": "Fetches and scans/reads the full text content of a course syllabus PDF. Mandatory to use whenever asked if attendance is required (חובת נוכחות), or about grading rules, homework policy, exam structure, course topics, or textbooks.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "courseCode": {
                    "type": "STRING",
                    "description": 'Course code (e.g., 61101, 61767) to find and scan its syllabus PDF.'
                },
                "url": {
                    "type": "STRING",
                    "description": "Direct URL of the syllabus PDF file if already known."
                }
            }
        }
    }
]

SYSTEM_INSTRUCTION_TEXT = """אתה פרופסור אורקה AI - עוזר אקדמי אישי ואינטליגנטי של סטודנטים במכללת אורט בראודה (Ort Braude College).

כלי ה-MCP הזמינים:
1. get_academic_calendar: אחזור תאריכים אקדמיים (סמסטרים, תקופות בחינות, הרשמה, חופשות).
2. search_courses: חיפוש קורסים לפי מילת מפתח, קוד קורס או שם מחלקה.
3. get_course_schedule: אחזור לוח זמנים מפורט עבור קורס (הרצאות, מעבדות, תרגולים, מרצים, כיתות ושעות).
4. scan_syllabus_pdf: סריקת קובץ סילבוס PDF של קורס (חובת נוכחות, הרכב ציון, מטלות וכד').

משאבי MCP זמינים:
- braude://calendar/current: קריאה ישירה של הלוח האקדמי הנוכחי בפורמט JSON.

כללי הפעלה מחייבים ל-AI:

1. תהליך טיפול בפניות לגבי קורסים (Workflow for Course Inquiries):
   - אם המשתמש מזין שם קורס ללא קוד (למשל "אלגברה ליניארית"), יש לקרוא תחילה לכלי search_courses(query="<שם הקורס>").
   - חלץ את קוד הקורס המדויק (5 ספרות) מתוך תוצאות החיפוש, ואז קרא לכלי get_course_schedule(courseCode="<קוד הקורס>").
   - אם המשתמש מספק קוד קורס בן 5 ספרות (כגון 61101), קרא ישירות לכלי get_course_schedule.

2. תהליך טיפול בפניות לגבי הלוח האקדמי (Calendar Inquiries):
   - לשאלות בנוגע לתאריכי סמסטרים, תאריכי בחינות, מועדי הרשמה או חופשות - השתמש בכלי get_academic_calendar או קרא את המשאב braude://calendar/current.

3. עיצוב התשובה (Output Formatting):
   - הבדל בבירור בין הרצאות (הרצאה) לבין מעבדות/תרגולים (מעבדה/תרגול).
   - פרט מספרי קבוצות, שמות מרצים/מתרגלים, ימים, שעות ומיקומי כיתות בטבלאות עבריות נקיות או ברשימות מובנות.
   - ענה בעברית רהוטה, ברורה, מפורטת ומדויקת בלבד."""


async def fetch_and_parse_pdf(pdf_url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(pdf_url, headers=headers)
            if resp.status_code != 200:
                return f"שגיאה בהורדת קובץ הסילבוס מהכתובת {pdf_url} (קוד סטטוס HTTP {resp.status_code})."
            
            pdf_bytes = resp.content
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            num_pages = len(reader.pages)
            extracted_text_parts = []
            
            for page_idx, page in enumerate(reader.pages):
                p_text = page.extract_text() or ""
                extracted_text_parts.append(f"--- עמוד {page_idx + 1} ---\n{p_text}")
            
            full_text = "\n\n".join(extracted_text_parts).strip()
            if not full_text:
                return f"הורד קובץ סילבוס PDF ({num_pages} עמודים), אך לא נשלף ממנו טקסט קריא."
            
            return f"סילבוס PDF נסרק בהצלחה מכתובת {pdf_url} ({num_pages} עמודים):\n\n{full_text}"
    except Exception as e:
        logger.error(f"Error parsing PDF from {pdf_url}: {e}")
        return f"שגיאה בעת סריקת קובץ ה-PDF של הסילבוס: {str(e)}"

async def call_mcp_tool(tool_name: str, tool_args: Dict[str, Any]) -> str:
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": tool_args
        }
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(BRAUDE_MCP_URL, json=payload, headers=headers)
        if resp.status_code != 200:
            return f"Error executing tool {tool_name}: HTTP status {resp.status_code}"
        data = resp.json()
        if "error" in data:
            return f"MCP Error: {data['error'].get('message', 'Unknown error')}"
        result = data.get("result", {})
        content_list = result.get("content", [])
        if content_list and isinstance(content_list, list):
            text_blocks = [item.get("text", "") for item in content_list if item.get("type") == "text"]
            return "\n".join(text_blocks)
        return str(result)


class ScheduleRequest(BaseModel):
    year: str = "2026"
    semester: str = "B"
    course_ids: List[str]
    exclude_days: Optional[List[str]] = None
    preferred_num_days: Optional[int] = None
    preferred_start_times: Optional[Dict[str, str]] = None
    max_overlap_minutes: Optional[int] = 0

class VerifyRequest(BaseModel):
    turnstile_token: str

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

def issue_clearance(expires_at: int) -> str:
    """Issue a stateless HMAC clearance token. No server-side session store."""
    if not TURNSTILE_SECRET_KEY:
        return "orca-dev"
    nonce = secrets.token_urlsafe(16)
    payload = f"orca1.{expires_at}.{nonce}"
    signature = hmac.new(
        TURNSTILE_SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}.{signature}"

def verify_clearance(token: Optional[str]) -> bool:
    """Validate an HMAC clearance token without server-side state."""
    if not TURNSTILE_SECRET_KEY:
        return True
    if not token:
        logger.warning("Clearance token missing in secure mode.")
        return False
    try:
        payload, signature = token.rsplit(".", 1)
        expected = hmac.new(
            TURNSTILE_SECRET_KEY.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning("Clearance token signature mismatch.")
            return False
        parts = payload.split(".")
        if len(parts) != 3 or parts[0] != "orca1":
            logger.warning("Clearance token has an invalid payload shape.")
            return False
        if int(parts[1]) < time.time():
            logger.warning("Clearance token expired.")
            return False
        return True
    except Exception as e:
        logger.warning(f"Invalid clearance token: {e}")
        return False

def require_clearance(token: Optional[str]) -> None:
    if not verify_clearance(token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bot protection verification failed. Please refresh and try again."
        )

@app.get("/api/courses", summary="Get distinct available courses")
def get_courses(year: Optional[str] = None, semester: Optional[str] = None):
    """
    Statelessly retrieves distinct available courses from the upstream database cache,
    optionally filtered by year and semester. Returns available metadata statelessly.
    """
    try:
        result = get_all_courses(year, semester)
        return result
    except Exception as e:
        logger.error(f"Error fetching courses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {e}"
        )

@app.post("/api/verify", summary="Exchange a Turnstile token for site clearance")
def verify_access(req: VerifyRequest):
    """
    Redeems a one-time Cloudflare Turnstile token and returns a stateless
    HMAC clearance used by subsequent protected API calls.
    """
    if not verify_turnstile(req.turnstile_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bot protection verification failed. Please try again."
        )
    expires_at = int(time.time()) + CLEARANCE_TTL_SECONDS
    return {
        "clearance": issue_clearance(expires_at),
        "expires_at": expires_at
    }

@app.post("/api/schedule", summary="Generate optimized schedule")
def generate_schedule_endpoint(
    req: ScheduleRequest,
    x_orca_clearance: Optional[str] = Header(default=None, alias="X-Orca-Clearance")
):
    """
    Executes the Simulated Annealing engine to generate an optimal schedule.
    Requires a clearance token issued by POST /api/verify after Turnstile.
    """
    require_clearance(x_orca_clearance)

    # Execute scheduler logic
    try:
        result = run_scheduler(
            year=req.year,
            semester=req.semester,
            course_ids=req.course_ids,
            exclude_days=req.exclude_days,
            preferred_num_days=req.preferred_num_days,
            preferred_start_times=req.preferred_start_times,
            max_overlap_minutes=req.max_overlap_minutes if req.max_overlap_minutes is not None else 0
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

@app.post("/api/chat", summary="AI Chat Assistant with Ort Braude MCP Integration & PDF Syllabus Scanning")
async def chat_endpoint(
    req: ChatRequest,
    x_orca_clearance: Optional[str] = Header(default=None, alias="X-Orca-Clearance")
):
    require_clearance(x_orca_clearance)
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="מפתח GEMINI_API_KEY אינו מוגדר בשרת. יש להגדיר GEMINI_API_KEY בקובץ backend/.env"
        )

    # Format incoming messages into Gemini contents
    contents = []
    for msg in req.messages:
        role = "user" if msg.role == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.content}]
        })

    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_key}"
    
    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION_TEXT}]
        },
        "tools": [
            {"function_declarations": MCP_TOOL_DECLARATIONS}
        ],
        "contents": contents
    }

    tools_called = []
    max_loops = 5

    async with httpx.AsyncClient(timeout=45.0) as client:
        for loop_idx in range(max_loops):
            resp = await client.post(gemini_url, json=payload)
            if resp.status_code != 200:
                logger.error(f"Gemini API error: {resp.status_code} - {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"שגיאה בהתקשרות עם Gemini API ({resp.status_code})"
                )

            res_data = resp.json()
            candidates = res_data.get("candidates", [])
            if not candidates:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="לא התקבלה תשובה מ-Gemini API"
                )

            first_candidate = candidates[0]
            content_obj = first_candidate.get("content", {})
            parts = content_obj.get("parts", [])

            function_calls = []
            final_text_parts = []

            for part in parts:
                if "functionCall" in part:
                    function_calls.append(part["functionCall"])
                if "text" in part:
                    final_text_parts.append(part["text"])

            if not function_calls:
                # No more function calls, final text response ready
                return {
                    "content": "".join(final_text_parts) or "סליחה, לא הצלחתי לחלץ תשובה.",
                    "tools_called": tools_called
                }

            # Append model's response (with function call & thought signature) to contents
            contents.append({
                "role": "model",
                "parts": parts
            })

            # Process function calls against braude-mcp or internal tools
            for fc in function_calls:
                t_name = fc.get("name")
                t_args = fc.get("args", {})
                tools_called.append({"name": t_name, "args": t_args})

                logger.info(f"Invoking Tool: {t_name} with args: {t_args}")
                if t_name == "scan_syllabus_pdf":
                    pdf_url = t_args.get("url")
                    course_code = t_args.get("courseCode")

                    if not pdf_url and course_code:
                        sched_output = await call_mcp_tool("get_course_schedule", {"courseCode": course_code})
                        try:
                            sched_json = json.loads(sched_output)
                            if isinstance(sched_json, dict) and sched_json.get("syllabusUrl"):
                                pdf_url = sched_json["syllabusUrl"]
                        except Exception:
                            pass

                    if pdf_url:
                        tool_output = await fetch_and_parse_pdf(pdf_url)
                    elif course_code:
                        tool_output = f"לא נמצא קישור לסילבוס זמין עבור קורס {course_code} במערכת."
                else:
                    tool_output = await call_mcp_tool(t_name, t_args)

                # Append function response to contents with role 'user' for Gemini 3.5 API
                contents.append({
                    "role": "user",
                    "parts": [{
                        "functionResponse": {
                            "name": t_name,
                            "response": {
                                "name": t_name,
                                "content": tool_output
                            }
                        }
                    }]
                })

            # Update payload contents for next iteration loop
            payload["contents"] = contents

        # Fallback if loop finishes max iterations
        return {
            "content": "".join(final_text_parts) or "העוזר השלים מספר פניות למערכת בראודה.",
            "tools_called": tools_called
        }


# Mount static files fallback if present (must be mounted after API routes)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting production FastAPI server on port {port}...")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
