
import { classNames } from '../utils/helpers';

export type PreferenceMode = 'A' | 'B';

interface PreferenceToggleProps {
  mode: PreferenceMode;
  onChangeMode: (mode: PreferenceMode) => void;
  maxDays: number;
  onChangeMaxDays: (days: number) => void;
  excludedDays: string[];
  onChangeExcludedDays: (days: string[]) => void;
}

const DAYS_OF_WEEK = [
  { id: 'א', label: 'ראשון' },
  { id: 'ב', label: 'שני' },
  { id: 'ג', label: 'שלישי' },
  { id: 'ד', label: 'רביעי' },
  { id: 'ה', label: 'חמישי' },
];

export function PreferenceToggle({
  mode,
  onChangeMode,
  maxDays,
  onChangeMaxDays,
  excludedDays,
  onChangeExcludedDays
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
                      "flex-1 min-w-[80px] py-3 rounded-md border text-sm font-medium transition-colors flex flex-col items-center gap-1",
                      isExcluded 
                        ? "bg-danger/10 border-danger/50 text-danger" 
                        : "bg-surfaceHighlight border-border text-textPrimary hover:border-primary/50"
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
    </div>
  );
}
