import pytest
import os
import sys

# Ensure backend directory is in path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from optimizer_engine import CourseSchedulerSA

@pytest.fixture
def sample_overlapping_courses():
    return {
        "COURSE_A": {
            "Lecture": {
                "1": [{"day": "א", "start_time": "08:30", "end_time": "10:30"}]
            }
        },
        "COURSE_B": {
            # 30 min overlap with COURSE_A (10:00 to 10:30)
            "Lecture": {
                "1": [{"day": "א", "start_time": "10:00", "end_time": "12:00"}]
            }
        },
        "COURSE_C": {
            # 60 min overlap with COURSE_A (09:30 to 10:30)
            "Lecture": {
                "1": [{"day": "א", "start_time": "09:30", "end_time": "11:30"}]
            }
        },
        "COURSE_D": {
            # 120 min (full) overlap with COURSE_A (08:30 to 10:30)
            "Lecture": {
                "1": [{"day": "א", "start_time": "08:30", "end_time": "10:30"}]
            }
        }
    }

@pytest.fixture
def default_weights():
    return {
        "gaps": 1.0,
        "days_on_campus": 10.0,
        "start_time_deviation": 5.0,
        "exclude_days": 100000.0,
        "preferred_num_days": 100000.0,
        "overlap": 1500.0
    }

def test_strict_zero_overlap_flags_hard_violation(sample_overlapping_courses, default_weights):
    engine = CourseSchedulerSA(
        courses_data=sample_overlapping_courses,
        weights=default_weights,
        selected_course_ids=["COURSE_A", "COURSE_B"],
        max_overlap_minutes=0
    )
    state = {"COURSE_A": {"Lecture": "1"}, "COURSE_B": {"Lecture": "1"}}
    energy, has_hard_violations = engine.calculate_energy(state)
    assert has_hard_violations is True
    assert energy >= 500000 * 30

def test_30_min_overlap_allowed(sample_overlapping_courses, default_weights):
    engine = CourseSchedulerSA(
        courses_data=sample_overlapping_courses,
        weights=default_weights,
        selected_course_ids=["COURSE_A", "COURSE_B"],
        max_overlap_minutes=30
    )
    state = {"COURSE_A": {"Lecture": "1"}, "COURSE_B": {"Lecture": "1"}}
    energy, has_hard_violations = engine.calculate_energy(state)
    assert has_hard_violations is False
    # 30 min overlap: soft penalty = 1500 * (30/30)^2 = 1500. Campus days penalty = 500 * 10 * 1^3 = 5000
    assert energy == pytest.approx(1500.0 + 500 * 10 * (1**3), rel=1e-2)

def test_30_min_overlap_exceeded_flags_hard_violation(sample_overlapping_courses, default_weights):
    engine = CourseSchedulerSA(
        courses_data=sample_overlapping_courses,
        weights=default_weights,
        selected_course_ids=["COURSE_A", "COURSE_C"], # 60 min overlap
        max_overlap_minutes=30
    )
    state = {"COURSE_A": {"Lecture": "1"}, "COURSE_C": {"Lecture": "1"}}
    energy, has_hard_violations = engine.calculate_energy(state)
    assert has_hard_violations is True
    # Excess 30 min triggers hard penalty
    assert energy >= 500000 * 30

def test_60_min_overlap_allowed(sample_overlapping_courses, default_weights):
    engine = CourseSchedulerSA(
        courses_data=sample_overlapping_courses,
        weights=default_weights,
        selected_course_ids=["COURSE_A", "COURSE_C"],
        max_overlap_minutes=60
    )
    state = {"COURSE_A": {"Lecture": "1"}, "COURSE_C": {"Lecture": "1"}}
    energy, has_hard_violations = engine.calculate_energy(state)
    assert has_hard_violations is False
    # 60 min overlap: soft penalty = 1500 * (60/30)^2 = 6000. Campus days penalty = 500 * 10 * 1^3 = 5000
    assert energy == pytest.approx(6000.0 + 500 * 10 * (1**3), rel=1e-2)

def test_unlimited_overlap_allowed(sample_overlapping_courses, default_weights):
    engine = CourseSchedulerSA(
        courses_data=sample_overlapping_courses,
        weights=default_weights,
        selected_course_ids=["COURSE_A", "COURSE_D"], # 120 min overlap
        max_overlap_minutes=-1
    )
    state = {"COURSE_A": {"Lecture": "1"}, "COURSE_D": {"Lecture": "1"}}
    energy, has_hard_violations = engine.calculate_energy(state)
    assert has_hard_violations is False
    # 120 min overlap: soft penalty = 1500 * (120/30)^2 = 24000. Campus days = 5000
    assert energy == pytest.approx(24000.0 + 500 * 10 * (1**3), rel=1e-2)

def test_api_schedule_with_max_overlap_minutes():
    from fastapi.testclient import TestClient
    from app import app

    client = TestClient(app)
    payload = {
        "year": "2026",
        "semester": "B",
        "course_ids": ["104031"],
        "max_overlap_minutes": 30
    }
    response = client.post("/api/schedule", json=payload)
    assert response.status_code in [200, 400]

def test_real_database_2027_a_3_days_60m_overlap():
    from generate_schedule import get_courses_for_semester
    import json
    
    course_ids = ["61767", "61761", "61765", "61775"]
    courses_data = get_courses_for_semester("2027", "A")
    weights_path = os.path.join(backend_dir, "weights.json")
    with open(weights_path, "r", encoding="utf-8") as f:
        weights = json.load(f)

    engine = CourseSchedulerSA(
        courses_data=courses_data,
        weights=weights,
        selected_course_ids=course_ids,
        preferred_num_days=3,
        preferred_start_times={d: "08:30" for d in ["א", "ב", "ג", "ד", "ה"]},
        max_overlap_minutes=60
    )
    best_state, best_energy, has_hard = engine.optimize()
    formatted = engine.format_schedule(best_state)

    assert has_hard is False
    assert set(formatted.keys()) == {"א", "ב", "ד"}
    # Verify exactly 60 minute overlap on Wednesday (ד)
    wed_sessions = formatted["ד"]
    overlaps_found = []
    for i in range(len(wed_sessions)):
        for j in range(i + 1, len(wed_sessions)):
            ov = engine.get_overlap(wed_sessions[i], wed_sessions[j])
            if ov > 0:
                overlaps_found.append(ov)
    assert 60 in overlaps_found


