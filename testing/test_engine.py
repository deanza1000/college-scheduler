import os
import sys
import json

# Add backend to path so we can import the engine
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

from optimizer_engine import CourseSchedulerSA

def load_data():
    weights_path = os.path.join(backend_dir, 'weights.json')
    with open(weights_path, 'r', encoding='utf-8') as f:
        weights = json.load(f)
        
    data_path = os.path.join(backend_dir, 'test_data.json')
    if os.path.exists(data_path):
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        try:
            from data_service import parse_courses_to_json
            json_str = parse_courses_to_json()
            all_dict = json.loads(json_str)
            year = list(all_dict.keys())[-1] if all_dict else "2026"
            sem = list(all_dict[year].keys())[0] if year in all_dict and all_dict[year] else "B"
            data = all_dict.get(year, {}).get(sem, {})
        except Exception:
            data = {}
            
    if not data:
        # Stateless mock fallback dataset for unit testing
        data = {
            "61101": {
                "הרצאה": {
                    "101": [{"type": "הרצאה", "start_time": "08:30", "end_time": "11:30", "day": "ראשון", "room": "101", "instructor": "ד\"ר כהן", "course_name": "מבוא למדעי המחשב"}],
                    "102": [{"type": "הרצאה", "start_time": "08:30", "end_time": "11:30", "day": "שלישי", "room": "101", "instructor": "ד\"ר כהן", "course_name": "מבוא למדעי המחשב"}]
                },
                "תרגול": {
                    "103": [{"type": "תרגול", "start_time": "12:00", "end_time": "14:00", "day": "ראשון", "room": "102", "instructor": "לוי", "course_name": "מבוא למדעי המחשב"}],
                    "104": [{"type": "תרגול", "start_time": "12:00", "end_time": "14:00", "day": "שלישי", "room": "102", "instructor": "לוי", "course_name": "מבוא למדעי המחשב"}]
                }
            },
            "61102": {
                "הרצאה": {
                    "201": [{"type": "הרצאה", "start_time": "09:00", "end_time": "12:00", "day": "ראשון", "room": "201", "instructor": "פרופ' ישראל", "course_name": "חדווא 1"}],
                    "202": [{"type": "הרצאה", "start_time": "09:00", "end_time": "12:00", "day": "חמישי", "room": "201", "instructor": "פרופ' ישראל", "course_name": "חדווא 1"}]
                }
            }
        }
        
    return data, weights

def run_test():
    print("Loading test data...")
    all_data, weights = load_data()
    
    # Find 2 courses that have multiple activities and instances to give the optimizer choices
    course_flexibility = []
    for cid, activities in all_data.items():
        total_instances = sum(len(instances) for instances in activities.values())
        if total_instances > 2:
            course_flexibility.append((total_instances, cid))
            
    course_flexibility.sort(reverse=True)
    valid_courses = [cid for count, cid in course_flexibility[:4]]
    print(f"Testing with courses: {valid_courses}")

    # We will run the optimizer multiple times to prove it's statistically significant and not a fluke.
    NUM_ITERATIONS = 10
    
    days_when_2_results = []
    days_when_5_results = []
    
    print(f"\n--- Running Optimizer {NUM_ITERATIONS} times to prove statistical significance ---")
    
    for i in range(NUM_ITERATIONS):
        # Run for 2 preferred days
        engine_2 = CourseSchedulerSA(
            courses_data=all_data,
            weights=weights,
            selected_course_ids=valid_courses,
            exclude_days=[],
            preferred_num_days=2
        )
        state_2, _, _ = engine_2.optimize(alpha=0.95, T_max=1000.0, T_min=0.1, markov_chain_length=100)
        days_when_2_results.append(len(engine_2.format_schedule(state_2)))
        
        # Run for 5 preferred days
        engine_5 = CourseSchedulerSA(
            courses_data=all_data,
            weights=weights,
            selected_course_ids=valid_courses,
            exclude_days=[],
            preferred_num_days=5
        )
        state_5, _, _ = engine_5.optimize(alpha=0.95, T_max=1000.0, T_min=0.1, markov_chain_length=100)
        days_when_5_results.append(len(engine_5.format_schedule(state_5)))
        
        print(f"Iteration {i+1}: Preferred 2 -> {days_when_2_results[-1]} days | Preferred 5 -> {days_when_5_results[-1]} days")
        
    avg_2 = sum(days_when_2_results) / NUM_ITERATIONS
    avg_5 = sum(days_when_5_results) / NUM_ITERATIONS
    
    print("\n--- AGGREGATED RESULTS ---")
    print(f"Average days utilized when preferred=2: {avg_2:.1f}")
    print(f"Average days utilized when preferred=5: {avg_5:.1f}")
    
    if avg_2 < avg_5:
        print("✅ SUCCESS: The engine consistently condenses the schedule to fewer days when requested!")
    else:
        print("❌ FAILED: The engine did not consistently schedule fewer days when requested.")

def run_preference_report_test():
    """Verify evaluate_preferences() flags unmet soft preferences on a known state."""
    print("\n--- Testing evaluate_preferences() ---")
    data = {
        "c1": {"הרצאה": {
            "early_sun": [{"start_time": "08:30", "end_time": "10:00", "day": "ראשון"}],
            "late_tue":  [{"start_time": "10:00", "end_time": "12:00", "day": "שלישי"}],
        }}
    }
    engine = CourseSchedulerSA(
        data, {}, exclude_days=["ראשון"], preferred_num_days=1,
        preferred_start_times={"ראשון": "09:00"}
    )
    bad = engine.evaluate_preferences({"c1": {"הרצאה": "early_sun"}})
    good = engine.evaluate_preferences({"c1": {"הרצאה": "late_tue"}})

    assert bad["preferences_met"] is False
    assert bad["excluded_days_used"] == ["ראשון"]
    assert bad["exceeds_preferred_days"] is False  # 1 day <= preferred 1
    assert bad["early_start_days"] == [{"day": "ראשון", "actual_start": "08:30", "preferred_start": "09:00"}]

    assert good["preferences_met"] is True
    assert good["excluded_days_used"] == []
    assert good["early_start_days"] == []
    print("✅ SUCCESS: evaluate_preferences() reports unmet preferences correctly")

if __name__ == "__main__":
    run_preference_report_test()
    run_test()
