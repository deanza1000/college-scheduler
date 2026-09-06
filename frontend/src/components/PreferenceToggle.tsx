
import { useState } from 'react';
import { Calendar, Blend, Clock, ChevronDown } from 'lucide-react';
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

type SectionId = 'days' | 'overlap' | 'times';

const DAYS_OF_WEEK = [
  { id: 'א', label: 'ראשון' },
  { id: 'ב', label: 'שני' },
  { id: 'ג', label: 'שלישי' },
  { id: 'ד', label: 'רביעי' },
  { id: 'ה', label: 'חמישי' },
];

const DEFAULT_MAX_DAYS = 4;
const DEFAULT_START_TIME = '08:30';

const OVERLAP_OPTIONS = [
  { value: 0, title: 'ללא חפיפה', subtitle: 'ללא התנגשויות (מומלץ)', isWarning: false },
  { value: 30, title: 'עד 30 דקות', subtitle: 'חפיפה קלה', isWarning: false },
  { value: 60, title: 'עד שעה', subtitle: 'חפיפה בינונית', isWarning: false },
  { value: -1, title: 'חפיפה מלאה', subtitle: 'ללא הגבלה', isWarning: true },
];

/** A small colored dot shown on a collapsed section header when its value differs
 *  from the default — amber for a risky/not-recommended choice, blue otherwise. */
function CustomizedDot({ tone }: { tone: 'warning' | 'info' }) {
  return (
    <span
      className={classNames(
        'inline-block w-1.5 h-1.5 rounded-full shrink-0',
        tone === 'warning' ? 'bg-amber-500' : 'bg-primary-light'
      )}
    />
  );
}

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
  // Accordion: only one section open at a time. Days is the most commonly
  // adjusted preference, so it starts expanded.
  const [openSection, setOpenSection] = useState<SectionId | null>('days');

  const toggleSection = (id: SectionId) => {
    setOpenSection(prev => (prev === id ? null : id));
  };

  const toggleExcludeDay = (dayId: string) => {
    if (excludedDays.includes(dayId)) {
      onChangeExcludedDays(excludedDays.filter(d => d !== dayId));
    } else {
      onChangeExcludedDays([...excludedDays, dayId]);
    }
  };

  const daysSummary = mode === 'A'
    ? `מקסימום ${maxDays} ימים`
    : excludedDays.length > 0
      ? `לא זמין: ${excludedDays.map(id => DAYS_OF_WEEK.find(d => d.id === id)?.label ?? id).join(', ')}`
      : 'כל הימים פנויים';
  const daysCustomized = mode === 'B' ? excludedDays.length > 0 : maxDays !== DEFAULT_MAX_DAYS;

  const overlapOption = OVERLAP_OPTIONS.find(o => o.value === maxOverlapMinutes) ?? OVERLAP_OPTIONS[0];
  const overlapCustomized = maxOverlapMinutes !== 0;

  const customizedTimeDays = Object.entries(preferredStartTimes).filter(
    ([, time]) => time && time !== DEFAULT_START_TIME
  );
  const timesSummary = customizedTimeDays.length > 0
    ? `מותאם ל-${customizedTimeDays.length} ${customizedTimeDays.length === 1 ? 'יום' : 'ימים'}`
    : `ברירת מחדל (${DEFAULT_START_TIME})`;
  const timesCustomized = customizedTimeDays.length > 0;

  const sectionHeaderClasses = (id: SectionId) => classNames(
    'w-full flex items-center justify-between gap-3 p-3 text-right transition-colors',
    openSection === id ? '' : 'hover:bg-surfaceHighlight/50'
  );

  return (
    <div dir="rtl">
      <h3 className="text-sm font-semibold text-textPrimary mb-2.5">אילוצים והעדפות</h3>

      <div className="flex flex-col gap-2">

        {/* Days */}
        <div
          className={classNames(
            'rounded-lg border overflow-hidden',
            openSection === 'days' ? 'border-primary/40 bg-primary/5' : 'border-border/80 bg-surfaceHighlight/30'
          )}
        >
          <button type="button" onClick={() => toggleSection('days')} className={sectionHeaderClasses('days')}>
            <div className="flex items-center gap-2 min-w-0">
              <Calendar size={16} className="text-textSecondary shrink-0" />
              <span className="text-sm font-bold text-textPrimary shrink-0">ימים בשבוע</span>
              <span className="text-xs text-textSecondary truncate">{daysSummary}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {openSection !== 'days' && daysCustomized && <CustomizedDot tone="info" />}
              <ChevronDown
                size={16}
                className={classNames(
                  'text-textSecondary transition-transform duration-300',
                  openSection === 'days' ? 'rotate-180' : 'rotate-0'
                )}
              />
            </div>
          </button>
          <div
            className={classNames(
              'overflow-hidden transition-all duration-300 ease-in-out',
              openSection === 'days' ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="px-3 pb-3.5 pt-1">
              <div className="flex bg-surfaceHighlight p-1 rounded-md mb-3.5">
                <button
                  className={classNames(
                    'flex-1 py-2 text-sm font-medium rounded transition-colors',
                    mode === 'A' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:text-textPrimary'
                  )}
                  onClick={() => onChangeMode('A')}
                >
                  מספר ימים מירבי
                </button>
                <button
                  className={classNames(
                    'flex-1 py-2 text-sm font-medium rounded transition-colors',
                    mode === 'B' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:text-textPrimary'
                  )}
                  onClick={() => onChangeMode('B')}
                >
                  ימים ספציפיים
                </button>
              </div>

              {mode === 'A' ? (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-sm font-medium text-textSecondary mb-2.5">
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
                  <label className="block text-sm font-medium text-textSecondary mb-2.5">
                    סמן את הימים בהם אינך יכול להגיע לקמפוס:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const isExcluded = excludedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          onClick={() => toggleExcludeDay(day.id)}
                          className={classNames(
                            'flex-1 min-w-[72px] py-2 rounded-md border text-sm font-medium transition-all duration-200 flex flex-col items-center gap-0.5 shadow-sm',
                            isExcluded
                              ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]'
                              : 'bg-surfaceHighlight/40 border-border/80 text-textSecondary hover:border-primary/50 hover:text-textPrimary hover:bg-surfaceHighlight/80'
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
        </div>

        {/* Overlap */}
        <div
          className={classNames(
            'rounded-lg border overflow-hidden',
            openSection === 'overlap'
              ? 'border-primary/40 bg-primary/5'
              : overlapOption.isWarning
                ? 'border-amber-500/35 bg-surfaceHighlight/30'
                : 'border-border/80 bg-surfaceHighlight/30'
          )}
        >
          <button type="button" onClick={() => toggleSection('overlap')} className={sectionHeaderClasses('overlap')}>
            <div className="flex items-center gap-2 min-w-0">
              <Blend size={16} className="text-textSecondary shrink-0" />
              <span className="text-sm font-bold text-textPrimary shrink-0">חפיפה בין שיעורים</span>
              {openSection !== 'overlap' && (
                <span className="text-xs text-textSecondary truncate">{overlapOption.title}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {openSection !== 'overlap' && overlapCustomized && (
                <CustomizedDot tone={overlapOption.isWarning ? 'warning' : 'info'} />
              )}
              <ChevronDown
                size={16}
                className={classNames(
                  'text-textSecondary transition-transform duration-300',
                  openSection === 'overlap' ? 'rotate-180' : 'rotate-0'
                )}
              />
            </div>
          </button>
          <div
            className={classNames(
              'overflow-hidden transition-all duration-300 ease-in-out',
              openSection === 'overlap' ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="px-3 pb-3.5 pt-1">
              <label className="block text-sm font-medium text-textSecondary mb-2.5">
                אפשרות חפיפה בין שיעורים:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OVERLAP_OPTIONS.map((opt) => {
                  const isSelected = maxOverlapMinutes === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChangeMaxOverlapMinutes(opt.value)}
                      className={classNames(
                        'relative p-2.5 rounded-lg border text-right transition-all duration-200 flex flex-col justify-between gap-0.5 shadow-sm group cursor-pointer',
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(59,130,246,0.15)] ring-1 ring-primary/40'
                          : 'bg-surfaceHighlight/40 border-border/80 text-textSecondary hover:border-primary/40 hover:text-textPrimary hover:bg-surfaceHighlight/70'
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={classNames('text-sm font-bold', isSelected ? 'text-primary-light' : 'text-textPrimary')}>
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
          </div>
        </div>

        {/* Preferred start times */}
        <div
          className={classNames(
            'rounded-lg border overflow-hidden',
            openSection === 'times' ? 'border-primary/40 bg-primary/5' : 'border-border/80 bg-surfaceHighlight/30'
          )}
        >
          <button type="button" onClick={() => toggleSection('times')} className={sectionHeaderClasses('times')}>
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={16} className="text-textSecondary shrink-0" />
              <span className="text-sm font-bold text-textPrimary shrink-0">שעות התחלה מועדפות</span>
              {openSection !== 'times' && (
                <span className="text-xs text-textSecondary truncate">{timesSummary}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {openSection !== 'times' && timesCustomized && <CustomizedDot tone="info" />}
              <ChevronDown
                size={16}
                className={classNames(
                  'text-textSecondary transition-transform duration-300',
                  openSection === 'times' ? 'rotate-180' : 'rotate-0'
                )}
              />
            </div>
          </button>
          <div
            className={classNames(
              'overflow-hidden transition-all duration-300 ease-in-out',
              openSection === 'times' ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="px-3 pb-3.5 pt-1">
              <label className="block text-sm font-medium text-textSecondary mb-2.5">
                בחר שעת התחלה מועדפת לכל יום (אופציונלי):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.id} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{day.label}</span>
                    <input
                      type="time"
                      value={preferredStartTimes[day.id] || DEFAULT_START_TIME}
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
        </div>

      </div>
    </div>
  );
}
