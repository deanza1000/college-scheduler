import type { Event } from '../api/client';
import { CourseCard } from './CourseCard';

interface ResultsTableProps {
  scheduleData: Record<string, Event[]>;
}

const DAYS_OF_WEEK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

export function ResultsTable({ scheduleData }: ResultsTableProps) {
  if (!scheduleData || Object.keys(scheduleData).length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center text-textSecondary" dir="rtl">
        <p>לא נמצאו שיעורים לשבץ או שהמערכת ריקה.</p>
        <p className="text-sm mt-2">נסה לבחור קורסים וללחוץ על יצירת מערכת.</p>
      </div>
    );
  }

  // Find all unique times across all days
  const allTimes = new Set<string>();
  Object.values(scheduleData).forEach(dayEvents => {
    dayEvents.forEach(event => {
      allTimes.add(event.start_time);
    });
  });

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

  Object.entries(scheduleData).forEach(([day, events]) => {
    if (DAYS_OF_WEEK.includes(day)) {
      events.forEach(event => {
        const t = event.start_time;
        if (tableData[t] && tableData[t][day]) {
          tableData[t][day].push(event);
        }
      });
    }
  });

  return (
    <div className="card overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surfaceHighlight">
              <th className="p-3 border-b border-border text-right font-medium w-24">שעה</th>
              {DAYS_OF_WEEK.map(day => (
                <th key={day} className="p-3 border-b border-border text-center font-medium w-48">
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

                    return (
                      <td key={`${t}-${day}-${i}`} className="p-2 align-top border-l border-border/30">
                        {event ? (
                          <CourseCard event={event} isConflict={hasConflict} />
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
  );
}
