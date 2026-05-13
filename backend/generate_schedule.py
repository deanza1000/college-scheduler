import sys
import json
import os
from data_service import parse_courses_to_json
from optimizer_engine import CourseSchedulerSA

WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights.json")

def get_courses_for_semester(year: str, semester: str) -> dict:
    """
    Query the cached SQLite DB via parse_courses_to_json statelessly and return the courses dict
    for the given year and semester. Includes annual ('שנתי') courses.
    """
    semester_map = {"A": "א", "B": "ב", "SUMMER": "קיץ"}
    sem_hebrew = semester_map.get(semester.upper(), "ב")

    all_data = json.loads(parse_courses_to_json())

    if year not in all_data:
        print(f"Error: Year {year} not found in database. Available: {list(all_data.keys())}")
        return {}

    res = {}
    if sem_hebrew in all_data[year]:
        for k, v in all_data[year][sem_hebrew].items():
            res[str(k)] = v

    # Merge annual ('שנתי') courses if present
    if "שנתי" in all_data[year]:
        for k, v in all_data[year]["שנתי"].items():
            if str(k) not in res:
                res[str(k)] = v

    return res


def main():
    # --- Gather inputs ---
    if len(sys.argv) >= 4:
        # CLI mode: python generate_schedule.py <year> <semester> <course_id> [course_id ...]
        #   Optional flags: --exclude-days א,ה  --num-days 3
        year = sys.argv[1]
        semester = sys.argv[2]
        course_ids = []
        exclude_days_input = []
        preferred_num_days = None
        i = 3
        while i < len(sys.argv):
            if sys.argv[i] == "--exclude-days" and i + 1 < len(sys.argv):
                exclude_days_input = [d.strip() for d in sys.argv[i + 1].split(",") if d.strip()]
                i += 2
            elif sys.argv[i] == "--num-days" and i + 1 < len(sys.argv):
                preferred_num_days = int(sys.argv[i + 1])
                i += 2
            else:
                course_ids.append(sys.argv[i])
                i += 1
    else:
        print("Interactive mode:")
        year = input("Enter year (e.g. 2026): ").strip()
        semester = input("Enter semester (A for א, B for ב): ").strip()
        courses_input = input("Enter course IDs separated by space: ").strip()
        course_ids = courses_input.split()
        if not course_ids:
            return

        day_map = {"1": "א", "2": "ב", "3": "ג", "4": "ד", "5": "ה"}
        exclude_input = input("Days to exclude (e.g. 'א,ה' or 1,5  — leave empty to skip): ").strip()
        exclude_days_input = []
        if exclude_input:
            for token in exclude_input.split(","):
                token = token.strip()
                exclude_days_input.append(day_map.get(token, token))

        num_days_input = input("Preferred number of campus days (leave empty to skip): ").strip()
        preferred_num_days = int(num_days_input) if num_days_input else None

    # --- Load data ---
    courses_data = get_courses_for_semester(year, semester)
    if not courses_data:
        return

    if not os.path.exists(WEIGHTS_PATH):
        print(f"Error: weights.json not found at {WEIGHTS_PATH}")
        return
    with open(WEIGHTS_PATH, "r", encoding="utf-8") as f:
        weights = json.load(f)

    # --- Validate course IDs ---
    if not course_ids:
        print("No course IDs provided.")
        return

    valid_course_ids = []
    invalid_course_ids = []
    for cid in course_ids:
        if cid in courses_data:
            valid_course_ids.append(cid)
        else:
            invalid_course_ids.append(cid)
            print(f"Error: Course ID {cid} not found in {year} semester {semester}.")

    if invalid_course_ids:
        print("Aborting schedule generation. Please provide only valid course IDs.")
        return

    if not valid_course_ids:
        print("No valid course IDs provided.")
        return

    semester_label = {"A": "א", "B": "ב"}.get(semester.upper(), semester)
    print(f"\nGenerating schedule for year {year}, semester {semester_label}:")
    print(f"  Courses: {', '.join(valid_course_ids)}")
    if exclude_days_input:
        print(f"  Exclude days: {', '.join(exclude_days_input)}")
    if preferred_num_days is not None:
        print(f"  Preferred campus days: {preferred_num_days}")

    # --- Run optimizer ---
    engine = CourseSchedulerSA(
        courses_data, weights,
        selected_course_ids=valid_course_ids,
        exclude_days=exclude_days_input or None,
        preferred_num_days=preferred_num_days,
    )
    best_state, best_energy, has_hard_violations = engine.optimize(
        alpha=0.95, T_max=1000.0, T_min=0.1, markov_chain_length=100
    )

    schedule = engine.format_schedule(best_state)

    if has_hard_violations:
        print("\nWARNING: The generated schedule has overlapping classes (hard violations).")

    # --- Render table ---
    days = ["א", "ב", "ג", "ד", "ה"]

    all_times = set()
    for day_events in schedule.values():
        for event in day_events:
            all_times.add(event["start_time"])

    sorted_times = sorted(list(all_times), key=lambda t: tuple(map(int, t.split(':'))))

    table_data = {t: {d: [] for d in days} for t in sorted_times}

    for day, events in schedule.items():
        if day in days:
            for event in events:
                t = event["start_time"]
                table_data[t][day].append(event)

    col_width = 30
    header = f"{'שעה':<8} | " + " | ".join(f"{d:^{col_width}}" for d in days)
    separator = "-" * len(header)

    def truncate(text, width):
        if len(text) > width:
            return text[:width-3] + "..."
        return text

    print("\n" + separator)
    print(header)
    print(separator)

    for t in sorted_times:
        row_events = table_data[t]
        max_events = max(len(row_events[d]) for d in days)
        if max_events == 0:
            max_events = 1

        for i in range(max_events):
            sub_lines = {d: [] for d in days}
            for d in days:
                if i < len(row_events[d]):
                    ev = row_events[d][i]
                    course_name = ev.get('course_name', ev['course_id'])
                    sub_lines[d] = [
                        truncate(course_name, col_width),
                        f"{ev['start_time']}-{ev['end_time']}  [{ev['activity_type']}]",
                        truncate(ev.get('instructor', '') or '', col_width),
                        truncate(ev.get('room', '') or '', col_width),
                    ]
                else:
                    sub_lines[d] = ["", "", "", ""]

            for line_idx in range(4):
                if line_idx == 0:
                    time_str = t
                else:
                    time_str = ""
                row_str = f"{time_str:<8} | "
                col_strs = []
                for d in days:
                    col_strs.append(f"{sub_lines[d][line_idx]:<{col_width}}")
                row_str += " | ".join(col_strs)
                print(row_str)
        print(separator)

if __name__ == "__main__":
    main()
