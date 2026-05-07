import type { Event } from '../api/client';
import { fixHebrewText, classNames } from '../utils/helpers';
import { Clock, MapPin, User, BookOpen } from 'lucide-react';

interface CourseCardProps {
  event: Event;
  isConflict?: boolean;
}

export function CourseCard({ event, isConflict }: CourseCardProps) {
  const courseName = fixHebrewText(event.course_name || event.course_id);
  const activityType = fixHebrewText(event.activity_type);
  const instructor = fixHebrewText(event.instructor);
  const room = fixHebrewText(event.room);
  
  // Determine color theme based on activity type
  let typeClasses = 'bg-surfaceHighlight border-border';
  if (event.activity_type.includes('ליגרת') || event.activity_type.includes('תרגיל')) {
    typeClasses = 'bg-primary/10 border-primary/30 text-primary-light';
  } else if (event.activity_type.includes('מעבדה')) {
    typeClasses = 'bg-success/10 border-success/30 text-success-light';
  } else if (event.activity_type.includes('האצרה')) { // "הרצאה" reversed
    typeClasses = 'bg-purple-500/10 border-purple-500/30 text-purple-400';
  }

  return (
    <div 
      className={classNames(
        "p-3 rounded-md border text-sm flex flex-col gap-2 relative h-full transition-all hover:shadow-md",
        typeClasses,
        isConflict && "border-danger ring-1 ring-danger shadow-[0_0_10px_rgba(239,68,68,0.3)]"
      )}
      dir="rtl"
    >
      {isConflict && (
        <div className="absolute top-0 right-0 bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-bl-md rounded-tr-md font-bold">
          התנגשות
        </div>
      )}
      
      <div className="font-bold text-textPrimary leading-tight">{courseName}</div>
      <div className="text-xs opacity-90 flex items-center gap-1">
        <BookOpen size={12} /> {activityType}
      </div>
      
      <div className="mt-auto pt-2 flex flex-col gap-1 text-xs opacity-80 border-t border-border/50">
        <div className="flex items-center gap-1">
          <Clock size={12} /> <span dir="ltr">{event.start_time} - {event.end_time}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 truncate w-1/2" title={instructor}>
            <User size={12} className="shrink-0" /> <span className="truncate">{instructor}</span>
          </div>
          <div className="flex items-center gap-1 truncate w-1/2" title={room}>
            <MapPin size={12} className="shrink-0" /> <span className="truncate">{room}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
