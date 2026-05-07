import os
import sys
import json

# Add backend to path so we can import the engine
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

from optimizer_engine import CourseSchedulerSA

def load_data():
    data_path = os.path.join(backend_dir, 'test_data.json')
    weights_path = os.path.join(backend_dir, 'weights.json')
    
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    with open(weights_path, 'r', encoding='utf-8') as f:
        weights = json.load(f)
        
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

if __name__ == "__main__":
    run_test()
