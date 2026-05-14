import type { Event } from '../api/client';
import { fixHebrewText, classNames } from '../utils/helpers';
import { Clock, MapPin, User, BookOpen } from 'lucide-react';

export interface CourseColorTheme {
  bg: string;
  border: string;
  text: string;
  accent: string;
}

export const COURSE_COLOR_THEMES: CourseColorTheme[] = [
  {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    accent: 'border-r-amber-500',
  },
  {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-300',
    accent: 'border-r-sky-500',
  },
  {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    accent: 'border-r-emerald-500',
  },
  {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-300',
    accent: 'border-r-violet-500',
  },
  {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    accent: 'border-r-rose-500',
  },
  {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    text: 'text-teal-300',
    accent: 'border-r-teal-500',
  },
  {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-300',
    accent: 'border-r-orange-500',
  },
  {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-300',
    accent: 'border-r-indigo-500',
  },
  {
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
    text: 'text-fuchsia-300',
    accent: 'border-r-fuchsia-500',
  },
];

interface CourseCardProps {
  event: Event;
  isConflict?: boolean;
  courseIndex?: number;
}

export function CourseCard({ event, isConflict, courseIndex }: CourseCardProps) {
  const courseName = fixHebrewText(event.course_name || event.course_id);
  const activityType = fixHebrewText(event.activity_type);
  const instructor = fixHebrewText(event.instructor);
  const room = fixHebrewText(event.room);
  
  // Determine color theme based on assigned courseIndex
  const themeIndex = courseIndex !== undefined ? courseIndex : 0;
  const theme = COURSE_COLOR_THEMES[themeIndex % COURSE_COLOR_THEMES.length];

  return (
    <div 
      className={classNames(
        "p-3 rounded-md border border-r-4 text-sm flex flex-col gap-2 relative h-full transition-all hover:shadow-md",
        theme.bg,
        theme.border,
        theme.accent,
        isConflict && "border-danger ring-1 ring-danger shadow-[0_0_10px_rgba(239,68,68,0.3)]"
      )}
      dir="rtl"
    >
      {isConflict && (
        <div className="absolute top-0 right-0 bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-bl-md rounded-tr-md font-bold z-10">
          התנגשות
        </div>
      )}
      
      <div className={classNames("font-bold leading-tight", theme.text)}>
        {courseName}
      </div>
      <div className="text-xs text-textPrimary/90 flex items-center gap-1">
        <BookOpen size={12} className="opacity-70 shrink-0" /> <span>{activityType}</span>
      </div>
      
      <div className="mt-auto pt-2 flex flex-col gap-1.5 text-xs text-textPrimary/80 border-t border-border/50">
        <div className="flex items-center gap-1">
          <Clock size={12} className="opacity-70 shrink-0" /> <span dir="ltr">{event.start_time} - {event.end_time}</span>
        </div>
        {instructor && (
          <div className="flex items-center gap-1 truncate" title={instructor}>
            <User size={12} className="opacity-70 shrink-0" /> <span className="truncate">{instructor}</span>
          </div>
        )}
        {room && (
          <div className="flex items-center gap-1 truncate" title={room}>
            <MapPin size={12} className="opacity-70 shrink-0" /> <span className="truncate">{room}</span>
          </div>
        )}
      </div>
    </div>
  );
}
