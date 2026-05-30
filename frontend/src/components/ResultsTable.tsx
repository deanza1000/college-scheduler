import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Download, Loader2 } from 'lucide-react';
import type { Event } from '../api/client';
import { CourseCard } from './CourseCard';

interface ResultsTableProps {
  scheduleData: Record<string, Event[]>;
}

const DAYS_OF_WEEK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

export function ResultsTable({ scheduleData }: ResultsTableProps) {
  const [selectedDay, setSelectedDay] = useState<string>('א');
  const [isDownloading, setIsDownloading] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  if (!scheduleData || Object.keys(scheduleData).length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center text-textSecondary" dir="rtl">
        <p>לא נמצאו שיעורים לשבץ או שהמערכת ריקה.</p>
        <p className="text-sm mt-2">נסה לבחור קורסים וללחוץ על יצירת מערכת.</p>
      </div>
    );
  }

  // Find all unique times across all days and unique courses for stable color mapping
  const allTimes = new Set<string>();
  const courseKeysSet = new Set<string>();
  if (scheduleData && typeof scheduleData === 'object') {
    Object.values(scheduleData).forEach(dayEvents => {
      if (Array.isArray(dayEvents)) {
        dayEvents.forEach(event => {
          if (event) {
            if (event.start_time) {
              allTimes.add(event.start_time);
            }
            const key = (event.course_name || event.course_id || '').trim();
            if (key) {
              courseKeysSet.add(key);
            }
          }
        });
      }
    });
  }

  // Sort course keys alphabetically to guarantee a stable, deterministic color assignment
  const sortedCourseKeys = Array.from(courseKeysSet).sort();

  // Sort times chronologically
  const sortedTimes = Array.from(allTimes).sort((a, b) => {
    const [ha, ma] = a.split(':').map(Number);
    const [hb, mb] = b.split(':').map(Number);
    return (ha * 60 + ma) - (hb * 60 + mb);
  });

  // Group data by time -> day -> events array
  const tableData: Record<string, Record<string, Event[]>> = {};
  sortedTimes.forEach(t => {
    tableData[t] = {};
    DAYS_OF_WEEK.forEach(d => { tableData[t][d] = []; });
  });

  if (scheduleData && typeof scheduleData === 'object') {
    Object.entries(scheduleData).forEach(([day, events]) => {
      if (DAYS_OF_WEEK.includes(day)) {
        if (Array.isArray(events)) {
          events.forEach(event => {
            if (event && event.start_time) {
              const t = event.start_time;
              if (tableData[t] && tableData[t][day]) {
                tableData[t][day].push(event);
              }
            }
          });
        }
      }
    });
  }

  const handleDownloadScreenshot = async () => {
    if (!tableRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#09090b', // match premium zinc-950 dark background
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'my_schedule.png';
      link.click();
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-4" dir="rtl">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-textPrimary">תצוגת מערכת שעות:</h3>
        <button
          onClick={handleDownloadScreenshot}
          disabled={isDownloading}
          className="btn-primary py-2 px-4 text-sm font-medium flex items-center gap-2 shadow-sm"
          title="שמור תמונה של המערכת"
        >
          {isDownloading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              <span>מייצר תמונה...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>שמור תמונה</span>
            </>
          )}
        </button>
      </div>

      {/* Desktop View: Full Grid */}
      <div ref={tableRef} className="hidden md:block card overflow-hidden p-2 bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1000px] border border-border/40">
            <thead>
              <tr className="bg-surfaceHighlight/60 backdrop-blur-md">
                <th className="p-3 border-b border-border text-right font-medium w-24">שעה</th>
                {DAYS_OF_WEEK.map(day => (
                  <th key={day} className="p-3 border-b border-border text-center font-medium w-56 min-w-[180px]">
                    יום {day}'
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTimes.map((t) => {
                const rowEvents = tableData[t];
                
                // Find max overlapping events in this time slot across all days
                let maxEvents = 1;
                DAYS_OF_WEEK.forEach(d => {
                  if (rowEvents[d].length > maxEvents) {
                    maxEvents = rowEvents[d].length;
                  }
                });

                // Create rows to accommodate overlapping events
                return Array.from({ length: maxEvents }).map((_, i) => (
                  <tr key={`${t}-${i}`} className="border-b border-border/50 hover:bg-surfaceHighlight/30 transition-colors">
                    {i === 0 && (
                      <td className="p-3 align-top border-l border-border/30 font-mono text-sm text-textSecondary" rowSpan={maxEvents}>
                        {t}
                      </td>
                    )}
                    
                    {DAYS_OF_WEEK.map(day => {
                      const eventsForDay = rowEvents[day];
                      const event = eventsForDay[i];
                      const hasConflict = eventsForDay.length > 1;

                      let courseIndex = 0;
                      if (event) {
                        const key = (event.course_name || event.course_id || '').trim();
                        courseIndex = sortedCourseKeys.indexOf(key);
                        if (courseIndex === -1) courseIndex = 0;
                      }

                      return (
                        <td key={`${t}-${day}-${i}`} className="p-2 align-top border-l border-border/30">
                          {event ? (
                            <CourseCard event={event} isConflict={hasConflict} courseIndex={courseIndex} />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View: Tabbed Daily Schedule */}
      <div className="md:hidden flex flex-col flex-1 min-h-[400px] card overflow-hidden bg-surface">
        {/* Tab Bar */}
        <div className="flex overflow-x-auto border-b border-border bg-surfaceHighlight/30 hide-scrollbar shrink-0">
          {DAYS_OF_WEEK.map(day => (
            <button
              key={`tab-${day}`}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-3 px-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                selectedDay === day 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-surfaceHighlight/50'
              }`}
            >
              יום {day}'
            </button>
          ))}
        </div>
        
        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedTimes.map(t => {
            const eventsForDay = tableData[t][selectedDay];
            if (!eventsForDay || eventsForDay.length === 0) return null;
            
            return eventsForDay.map((event, i) => {
              if (!event) return null;
              let courseIndex = 0;
              const key = (event.course_name || event.course_id || '').trim();
              if (key) {
                courseIndex = sortedCourseKeys.indexOf(key);
                if (courseIndex === -1) courseIndex = 0;
              }
              
              return (
                <div key={`${t}-${selectedDay}-${i}`} className="flex gap-3 items-stretch relative">
                  <div className="w-14 shrink-0 text-left pt-1">
                    <span className="text-sm font-mono font-bold text-textPrimary">{t}</span>
                  </div>
                  <div className="w-1 shrink-0 bg-border/50 rounded-full relative">
                    <div className="absolute top-2.5 right-[-3.5px] w-2 h-2 rounded-full bg-primary/60 border-2 border-surface"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <CourseCard event={event} isConflict={eventsForDay.length > 1} courseIndex={courseIndex} />
                  </div>
                </div>
              );
            });
          })}
          
          {/* Empty State Detection */}
          {sortedTimes.every(t => !tableData[t][selectedDay] || tableData[t][selectedDay].length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-textSecondary opacity-70">
              <span className="text-4xl mb-3">☕</span>
              <p className="font-medium">אין שיעורים ביום זה</p>
              <p className="text-sm mt-1">אפשר לנוח קצת!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
