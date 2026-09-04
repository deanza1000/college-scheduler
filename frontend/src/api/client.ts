export interface Course {
  id: string;
  name: string;
  semesters?: string[];
}

export interface ScheduleRequest {
  year: string;
  semester: string;
  course_ids: string[];
  exclude_days: string[];
  preferred_num_days: number | null;
  preferred_start_times?: Record<string, string>;
  max_overlap_minutes?: number;
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

export interface EarlyStartDay {
  day: string;
  actual_start: string;
  preferred_start: string;
}

export interface PreferenceIssues {
  excluded_days_used: string[];
  days_on_campus: number;
  preferred_num_days: number | null;
  exceeds_preferred_days: boolean;
  early_start_days: EarlyStartDay[];
}

export interface ScheduleResponse {
  schedule: Record<string, Event[]>;
  warnings?: {
    invalid_courses?: string[];
    has_hard_violations?: boolean;
    preferences_met?: boolean;
    preference_issues?: PreferenceIssues;
  };
  error?: string;
}

// Support dynamic API targeting when deployed, falling back to empty string for relative proxying
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'https://spork-scheduler-backend.onrender.com');

const CLEARANCE_STORAGE_KEY = 'orca_clearance';
export const CLEARANCE_EXPIRED_EVENT = 'orca-clearance-expired';

interface StoredClearance {
  token: string;
  expiresAt: number;
}

export class ClearanceExpiredError extends Error {
  constructor() {
    super('נדרש אימות אבטחה מחדש');
    this.name = 'ClearanceExpiredError';
  }
}

export function getClearance(): string | null {
  try {
    const raw = localStorage.getItem(CLEARANCE_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredClearance;
    if (!stored?.token || !stored.expiresAt || Date.now() / 1000 >= stored.expiresAt) {
      localStorage.removeItem(CLEARANCE_STORAGE_KEY);
      return null;
    }
    return stored.token;
  } catch {
    localStorage.removeItem(CLEARANCE_STORAGE_KEY);
    return null;
  }
}

export function hasValidClearance(): boolean {
  return getClearance() !== null;
}

export function storeClearance(token: string, expiresAt: number): void {
  localStorage.setItem(CLEARANCE_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
}

export function clearClearance(): void {
  localStorage.removeItem(CLEARANCE_STORAGE_KEY);
}

function authHeaders(): Record<string, string> {
  const clearance = getClearance();
  return clearance ? { 'X-Orca-Clearance': clearance } : {};
}

function rejectIfClearanceExpired(res: Response): void {
  if (res.status !== 403) return;
  clearClearance();
  window.dispatchEvent(new Event(CLEARANCE_EXPIRED_EVENT));
  throw new ClearanceExpiredError();
}

function readApiError(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const detail = (data as { detail?: unknown; error?: unknown }).detail;
  const error = (data as { error?: unknown }).error;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (typeof error === 'string' && error.trim()) return error;
  return null;
}

export async function verifyHuman(turnstileToken: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnstile_token: turnstileToken })
    });
  } catch {
    throw new Error('לא ניתן להתחבר לשרת האימות. ודא שה-backend רץ.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('נתיב האימות לא נמצא בשרת. ייתכן שה-backend לא עודכן.');
    }
    if (res.status >= 500) {
      throw new Error('השרת לא זמין לאימות. ודא שה-backend רץ.');
    }
    throw new Error(readApiError(data) || 'אימות האבטחה נכשל');
  }
  if (!data?.clearance || !data?.expires_at) {
    throw new Error('אימות האבטחה נכשל');
  }
  storeClearance(data.clearance, data.expires_at);
}

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
  const data = await res.json();
  // Support both new backend response format (object with metadata) and older deployments (raw array)
  if (Array.isArray(data)) {
    return {
      courses: data,
      year: year || '2026',
      semester: semester || 'B',
      available_years: ['2026']
    };
  }
  return data;
}

export async function generateSchedule(payload: ScheduleRequest): Promise<ScheduleResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(payload)
    });
    
    rejectIfClearanceExpired(res);
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

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  tools_called?: ToolCallInfo[];
}

export async function sendChatMessage(messages: ChatMessagePayload[]): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ messages })
  });

  rejectIfClearanceExpired(res);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.error || 'אירעה שגיאה בתקשורת עם השרת');
  }
  return data;
}

