import os
import json
from generate_schedule import get_courses_for_semester, WEIGHTS_PATH
from optimizer_engine import CourseSchedulerSA

def run_scheduler(year: str, semester: str, course_ids: list, exclude_days: list = None, preferred_num_days: int = None, preferred_start_times: dict = None):
    courses_data = get_courses_for_semester(year, semester)
    if not courses_data:
        return {"error": f"Could not load data for year {year}, semester {semester}."}

    if not os.path.exists(WEIGHTS_PATH):
        return {"error": f"weights.json not found at {WEIGHTS_PATH}."}

    with open(WEIGHTS_PATH, "r", encoding="utf-8") as f:
        weights = json.load(f)

    valid_course_ids = []
    invalid_course_ids = []
    for cid in course_ids:
        if cid in courses_data:
            valid_course_ids.append(cid)
        else:
            invalid_course_ids.append(cid)

    if not course_ids:
        return {"error": "No course IDs provided. Please enter at least one course ID."}

    if invalid_course_ids:
        return {"error": f"The following course IDs were not found: {', '.join(invalid_course_ids)}. Please check your input and try again."}

    if not valid_course_ids:
        return {"error": "No valid course IDs provided."}

    engine = CourseSchedulerSA(
        courses_data, weights,
        selected_course_ids=valid_course_ids,
        exclude_days=exclude_days or None,
        preferred_num_days=preferred_num_days,
        preferred_start_times=preferred_start_times,
    )
    
    best_state, best_energy, has_hard_violations = engine.optimize(
        T_max=1000.0, T_min=0.1, markov_chain_length=100
    )

    schedule = engine.format_schedule(best_state)

    return {
        "success": True,
        "schedule": schedule,
        "warnings": {
            "has_hard_violations": has_hard_violations
        }
    }
