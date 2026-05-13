import os
import time
import json
import sqlite3
import urllib.request
import logging

try:
    from bidi.algorithm import get_display
except ImportError:
    def get_display(text):
        return text

logger = logging.getLogger(__name__)

URL = "https://beta.braude.top/braude/api/db"
CACHED_DB_PATH = "/tmp/braude_cached.sqlite"
CACHE_TTL_SECONDS = 3600  # 1 hour cache

# In-memory dictionary cache to prevent redundant disk reads/JSON parsing per request
_IN_MEMORY_CACHE = {
    "timestamp": 0,
    "json_data": None,
    "courses_list": None
}

def get_cached_db_path() -> str:
    """
    Statelessly ensures the upstream SQLite database is cached locally in /tmp.
    Downloads the database if missing or older than CACHE_TTL_SECONDS.
    """
    download_needed = False
    if not os.path.exists(CACHED_DB_PATH):
        download_needed = True
    else:
        file_age = time.time() - os.path.getmtime(CACHED_DB_PATH)
        if file_age > CACHE_TTL_SECONDS:
            download_needed = True

    if download_needed:
        logger.info(f"Fetching latest SQLite DB statelessly from {URL}...")
        try:
            req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0 (StatelessBackendService/1.0)'})
            with urllib.request.urlopen(req, timeout=15) as response:
                temp_path = f"{CACHED_DB_PATH}.tmp"
                with open(temp_path, 'wb') as out_file:
                    while True:
                        chunk = response.read(8192)
                        if not chunk:
                            break
                        out_file.write(chunk)
                os.replace(temp_path, CACHED_DB_PATH)
                logger.info("Successfully cached remote SQLite database to ephemeral storage.")
                # Invalidate in-memory cache
                _IN_MEMORY_CACHE["timestamp"] = 0
        except Exception as e:
            logger.error(f"Failed to fetch upstream database: {e}")
            # Fallback: if cached DB exists but expired, keep using it rather than crashing
            if not os.path.exists(CACHED_DB_PATH):
                raise RuntimeError(f"Could not initialize database from upstream: {e}")

    return CACHED_DB_PATH

def parse_courses_to_json(db_path: str = None) -> str:
    """
    Translates the cached SQLite rows into specific JSON objects containing course 
    and session information. Uses in-memory TTL caching for optimal performance.
    """
    current_time = time.time()
    # Return in-memory cached string if valid
    if _IN_MEMORY_CACHE["json_data"] and (current_time - _IN_MEMORY_CACHE["timestamp"] < CACHE_TTL_SECONDS):
        return _IN_MEMORY_CACHE["json_data"]

    path_to_use = db_path or get_cached_db_path()
    if not os.path.exists(path_to_use):
        return json.dumps({})

    conn = sqlite3.connect(path_to_use)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = """
        SELECT 
            c.course_id,
            c.name as course_name,
            c.year,
            i.instance_id,
            i.type as session_type,
            s.semester,
            s.start_time,
            s.end_time,
            s.week_day,
            s.room,
            i.instructor
        FROM courses c
        JOIN instances i ON c.course_id = i.course_id AND c.year = i.year
        JOIN sessions s ON i.instance_id = s.instance_id
    """
    
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
    except sqlite3.Error as e:
        logger.error(f"Database error during parsing: {e}")
        conn.close()
        return json.dumps({})
        
    courses_dict = {}
    
    for row in rows:
        year = str(row['year'])
        semester = row['semester']
        course_id = row['course_id']
        instance_id = str(row['instance_id'])
        activity_type = get_display(row['session_type']) if row['session_type'] else 'Unknown'
        
        if year not in courses_dict:
            courses_dict[year] = {}
        if semester not in courses_dict[year]:
            courses_dict[year][semester] = {}
        if course_id not in courses_dict[year][semester]:
            courses_dict[year][semester][course_id] = {}
        if activity_type not in courses_dict[year][semester][course_id]:
            courses_dict[year][semester][course_id][activity_type] = {}
        if instance_id not in courses_dict[year][semester][course_id][activity_type]:
            courses_dict[year][semester][course_id][activity_type][instance_id] = []
            
        session = {
            "type": activity_type,
            "start_time": row['start_time'],
            "end_time": row['end_time'],
            "day": get_display(row['week_day']) if row['week_day'] else None,
            "room": get_display(row['room']) if row['room'] else None,
            "instructor": get_display(row['instructor']) if row['instructor'] else None,
            "course_name": get_display(row['course_name']) if row['course_name'] else None
        }
        
        courses_dict[year][semester][course_id][activity_type][instance_id].append(session)
        
    conn.close()
    
    json_result = json.dumps(courses_dict, ensure_ascii=False)
    
    # Update cache
    _IN_MEMORY_CACHE["json_data"] = json_result
    _IN_MEMORY_CACHE["timestamp"] = current_time
    
    return json_result

def get_all_courses() -> list:
    """
    Returns a list of distinct courses ordered by name for the GET /api/courses route.
    """
    current_time = time.time()
    if _IN_MEMORY_CACHE["courses_list"] and (current_time - _IN_MEMORY_CACHE["timestamp"] < CACHE_TTL_SECONDS):
        return _IN_MEMORY_CACHE["courses_list"]

    path_to_use = get_cached_db_path()
    if not os.path.exists(path_to_use):
        return []

    conn = sqlite3.connect(path_to_use)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT DISTINCT course_id as id, name FROM courses ORDER BY name")
        rows = cursor.fetchall()
        courses = [{"id": str(row["id"]), "name": row["name"] or str(row["id"])} for row in rows]
        _IN_MEMORY_CACHE["courses_list"] = courses
        return courses
    except Exception as e:
        logger.error(f"Failed to query courses list: {e}")
        return []
    finally:
        conn.close()
