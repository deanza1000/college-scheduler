export interface Course {
  id: string;
  name: string;
}

export interface ScheduleRequest {
  year: string;
  semester: string;
  course_ids: string[];
  exclude_days: string[];
  preferred_num_days: number | null;
  preferred_start_times?: Record<string, string>;
  turnstile_token?: string | null;
}

export interface Event {
  type: string;
  start_time: string;
  end_time: string;
  day: string;
  room: string;
  instructor: string;
  course_name: string;
  activity_type: string;
  course_id?: string;
}

export interface ScheduleResponse {
  schedule: Record<string, Event[]>;
  warnings?: {
    invalid_courses?: string[];
    has_hard_violations?: boolean;
  };
  error?: string;
}

// Support dynamic API targeting when deployed, falling back to empty string for relative proxying
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface CoursesResponse {
  courses: Course[];
  year: string;
  semester: string;
  available_years: string[];
}

export async function fetchCourses(year?: string, semester?: string): Promise<CoursesResponse> {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (semester) params.append('semester', semester);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${API_BASE}/api/courses${qs}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch courses: ${text}`);
  }
  return await res.json();
}

export async function generateSchedule(payload: ScheduleRequest): Promise<ScheduleResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.error || 'Server error');
    }
    return data;
  } catch (err: any) {
    console.error('Failed to generate schedule:', err);
    throw err;
  }
}
