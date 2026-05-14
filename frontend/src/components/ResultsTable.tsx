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
        backgroundColor: '#18181b',
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
    <div className="space-y-4" dir="rtl">
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

      <div ref={tableRef} className="card overflow-hidden p-2 bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-surfaceHighlight">
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
    </div>
  );
}
