
import { classNames } from '../utils/helpers';

export type PreferenceMode = 'A' | 'B';

interface PreferenceToggleProps {
  mode: PreferenceMode;
  onChangeMode: (mode: PreferenceMode) => void;
  maxDays: number;
  onChangeMaxDays: (days: number) => void;
  excludedDays: string[];
  onChangeExcludedDays: (days: string[]) => void;
  preferredStartTimes: Record<string, string>;
  onChangePreferredStartTimes: (times: Record<string, string>) => void;
  maxOverlapMinutes: number;
  onChangeMaxOverlapMinutes: (minutes: number) => void;
}

const DAYS_OF_WEEK = [
  { id: 'א', label: 'ראשון' },
  { id: 'ב', label: 'שני' },
  { id: 'ג', label: 'שלישי' },
  { id: 'ד', label: 'רביעי' },
  { id: 'ה', label: 'חמישי' },
];

const OVERLAP_OPTIONS = [
  { value: 0, title: 'ללא חפיפה', subtitle: 'ללא התנגשויות (מומלץ)', isWarning: false },
  { value: 30, title: 'עד 30 דקות', subtitle: 'חפיפה קלה', isWarning: false },
  { value: 60, title: 'עד שעה', subtitle: 'חפיפה בינונית', isWarning: false },
  { value: -1, title: 'חפיפה מלאה', subtitle: 'ללא הגבלה', isWarning: true },
];

export function PreferenceToggle({
  mode,
  onChangeMode,
  maxDays,
  onChangeMaxDays,
  excludedDays,
  onChangeExcludedDays,
  preferredStartTimes,
  onChangePreferredStartTimes,
  maxOverlapMinutes,
  onChangeMaxOverlapMinutes
}: PreferenceToggleProps) {
  
  const toggleExcludeDay = (dayId: string) => {
    if (excludedDays.includes(dayId)) {
      onChangeExcludedDays(excludedDays.filter(d => d !== dayId));
    } else {
      onChangeExcludedDays([...excludedDays, dayId]);
    }
  };

  return (
    <div className="card p-6" dir="rtl">
      <h2 className="text-xl font-bold mb-4">העדפות מערכת</h2>
      
      <div className="flex bg-surfaceHighlight p-1 rounded-md mb-6">
        <button
          className={classNames(
            "flex-1 py-2 text-sm font-medium rounded transition-colors",
            mode === 'A' ? "bg-primary text-white shadow" : "text-textSecondary hover:text-textPrimary"
          )}
          onClick={() => onChangeMode('A')}
        >
          מספר ימים מירבי
        </button>
        <button
          className={classNames(
            "flex-1 py-2 text-sm font-medium rounded transition-colors",
            mode === 'B' ? "bg-primary text-white shadow" : "text-textSecondary hover:text-textPrimary"
          )}
          onClick={() => onChangeMode('B')}
        >
          ימים ספציפיים
        </button>
      </div>

      <div className="min-h-[100px]">
        {mode === 'A' ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="block text-sm font-medium text-textSecondary mb-4">
              כמה ימים לכל היותר תרצה להגיע לקמפוס בשבוע? ({maxDays} ימים)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={maxDays}
              onChange={(e) => onChangeMaxDays(parseInt(e.target.value))}
              className="w-full accent-primary cursor-pointer h-2 bg-surfaceHighlight rounded-lg appearance-none"
              dir="ltr"
            />
            <div className="flex justify-between text-xs text-textSecondary mt-2 px-1" dir="ltr">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="block text-sm font-medium text-textSecondary mb-4">
              סמן את הימים בהם אינך יכול להגיע לקמפוס:
            </label>
            <div className="flex flex-wrap gap-3">
              {DAYS_OF_WEEK.map(day => {
                const isExcluded = excludedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    onClick={() => toggleExcludeDay(day.id)}
                    className={classNames(
                      "flex-1 min-w-[85px] py-3 rounded-md border text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 shadow-sm",
                      isExcluded 
                        ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]" 
                        : "bg-surfaceHighlight/40 border-border/80 text-textSecondary hover:border-primary/50 hover:text-textPrimary hover:bg-surfaceHighlight/80"
                    )}
                  >
                    <span>{day.label}</span>
                    <span className="text-xs opacity-80">
                      {isExcluded ? 'לא פנוי' : 'פנוי'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Overlap Options Section */}
      <div className="mt-8 pt-6 border-t border-border">
        <label className="block text-sm font-medium text-textSecondary mb-3">
          אפשרות חפיפה בין שיעורים:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OVERLAP_OPTIONS.map((opt) => {
            const isSelected = maxOverlapMinutes === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeMaxOverlapMinutes(opt.value)}
                className={classNames(
                  "relative p-3 rounded-lg border text-right transition-all duration-200 flex flex-col justify-between gap-1 shadow-sm group cursor-pointer",
                  isSelected
                    ? "bg-primary/10 border-primary shadow-[0_0_12px_rgba(59,130,246,0.15)] ring-1 ring-primary/40"
                    : "bg-surfaceHighlight/40 border-border/80 text-textSecondary hover:border-primary/40 hover:text-textPrimary hover:bg-surfaceHighlight/70"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={classNames("text-sm font-bold", isSelected ? "text-primary-light" : "text-textPrimary")}>
                    {opt.title}
                  </span>
                  {opt.isWarning && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      לא מומלץ
                    </span>
                  )}
                </div>
                <span className="text-xs opacity-75">{opt.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <label className="block text-sm font-medium text-textSecondary mb-4">
          בחר שעת התחלה מועדפת לכל יום (אופציונלי):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {DAYS_OF_WEEK.map(day => (
            <div key={day.id} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{day.label}</span>
              <input 
                type="time" 
                value={preferredStartTimes[day.id] || "08:30"}
                onChange={(e) => {
                  onChangePreferredStartTimes({
                    ...preferredStartTimes,
                    [day.id]: e.target.value
                  });
                }}
                className="p-2 border border-border rounded-md bg-surfaceHighlight focus:border-primary outline-none transition-colors"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
