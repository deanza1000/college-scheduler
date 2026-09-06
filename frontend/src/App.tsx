import { useEffect, useState } from 'react';
import { CourseSelectionHeader } from './components/CourseSelectionHeader';
import { PreferenceToggle } from './components/PreferenceToggle';
import type { PreferenceMode } from './components/PreferenceToggle';
import { ResultsTable } from './components/ResultsTable';
import { AiAssistantChat } from './components/AiAssistantChat';
import { AccessGate } from './components/AccessGate';
import { Footer } from './components/Footer';
import { CLEARANCE_EXPIRED_EVENT, generateSchedule, hasValidClearance } from './api/client';

import type { ScheduleResponse, ScheduleRequest } from './api/client';
import { Calendar, Loader2, AlertTriangle, Info, ChevronDown } from 'lucide-react';

function App() {
  const [isVerified, setIsVerified] = useState(() => hasValidClearance());
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  useEffect(() => {
    const handleExpired = () => setIsVerified(false);
    window.addEventListener(CLEARANCE_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(CLEARANCE_EXPIRED_EVENT, handleExpired);
  }, []);

  // Course Header State
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  // Preference State
  const [mode, setMode] = useState<PreferenceMode>('A');
  const [maxDays, setMaxDays] = useState(4);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const [preferredStartTimes, setPreferredStartTimes] = useState<Record<string, string>>({});
  const [maxOverlapMinutes, setMaxOverlapMinutes] = useState<number>(0);

  // Solving State
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (selectedCourseIds.length === 0) {
      setError("נא לבחור לפחות קורס אחד");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults(null);

    const payload: ScheduleRequest = {
      year,
      semester,
      course_ids: selectedCourseIds,
      exclude_days: mode === 'B' ? excludedDays : [],
      preferred_num_days: mode === 'A' ? maxDays : null,
      preferred_start_times: preferredStartTimes,
      max_overlap_minutes: maxOverlapMinutes
    };

    try {
      const response = await generateSchedule(payload);
      setResults(response);
      setIsSettingsExpanded(false);
    } catch (err: any) {
      setError(err.message || "אירעה שגיאה בשרת");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isVerified) {
    return <AccessGate onVerified={() => setIsVerified(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-textPrimary p-4 md:p-6 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-3 md:space-y-4">
        
        {/* Header */}
        <header className="flex items-center gap-4 pb-4 border-b border-border shrink-0">
          <div className="bg-primary/5 p-2 md:p-3 rounded-xl border border-primary/20 flex items-center justify-center relative overflow-hidden group shrink-0">
            <img 
              src="/favicon.svg" 
              alt="Professor Orca Icon" 
              className="w-12 h-12 md:w-14 md:h-14 object-contain transform group-hover:scale-105 transition-transform drop-shadow-md" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-primary via-primary-light to-sky-400 bg-clip-text text-transparent">
                Professor Orca
              </h1>
              <span className="text-textSecondary text-lg font-light">|</span>
              <span className="text-lg font-medium text-textPrimary">מערכת שיבוץ מערכות שעות</span>
            </div>
            <p className="text-textSecondary text-sm mt-1">
              תן לפרופסור למצוא את המערכת המושלמת עבורך – הגדר קורסים ואילוצים, והמנוע החכם שלנו יעשה את השאר
            </p>
          </div>
        </header>

        {/* Unified settings + generate panel */}
        <div className="card shrink-0 overflow-hidden transition-all duration-300 border border-border/80 bg-surface/50 backdrop-blur-md">
          <div 
            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-surfaceHighlight/20 transition-colors"
            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-bold text-textPrimary m-0">הגדרות ואילוצים</h2>
              {!isSettingsExpanded && (
                <div className="flex items-center gap-2 text-xs text-textSecondary bg-surfaceHighlight/40 px-3 py-1 rounded-full border border-border/50">
                  <span>שנה: {year || 'לא נבחרה'}</span>
                  <span>|</span>
                  <span>סמסטר: {semester === 'A' ? "א' (חורף)" : semester === 'B' ? "ב' (אביב)" : semester === 'Summer' ? "קיץ" : 'לא נבחר'}</span>
                  <span>|</span>
                  <span className="text-primary font-medium">{selectedCourseIds.length} קורסים נבחרו</span>
                </div>
              )}
            </div>
            <button type="button" className="text-textSecondary hover:text-textPrimary transition-colors p-1" aria-label="הרחב או כווץ הגדרות">
              <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${isSettingsExpanded ? 'rotate-180' : 'rotate-0'}`} />
            </button>
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isSettingsExpanded ? 'max-h-[1400px] opacity-100 border-t border-border/50' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="order-1 p-4 pb-2 lg:p-5 lg:pb-3 lg:border-l border-border/40 lg:col-start-1 lg:row-start-1">
                <CourseSelectionHeader 
                  selectedCourseIds={selectedCourseIds}
                  onChangeCourses={setSelectedCourseIds}
                  year={year}
                  onChangeYear={setYear}
                  semester={semester}
                  onChangeSemester={setSemester}
                />
              </div>

              <div className="order-3 px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:border-l border-t border-border/40 space-y-3 lg:col-start-1 lg:row-start-2">
                {error && (
                  <div className="bg-danger/10 border border-danger/50 text-danger-light p-2.5 rounded-md flex items-start gap-2 text-sm">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedCourseIds.length === 0}
                  className="w-full btn-primary py-3 text-base font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      מייצר מערכת שעות אופטימלית...
                    </>
                  ) : (
                    "צור מערכת שעות אופטימלית"
                  )}
                </button>
                {selectedCourseIds.length === 0 && (
                  <p className="text-xs text-textSecondary flex items-center gap-1">
                    <Info size={12} className="shrink-0" /> אנא בחר קורסים מהרשימה לפני היצירה
                  </p>
                )}
                <p className="text-xs text-textSecondary/80 flex items-start gap-1.5 leading-relaxed">
                  <Info size={13} className="text-primary-light shrink-0 mt-px" />
                  המערכת יכולה להפיק מערכת שאינה אופטימלית — מומלץ להריץ כמה פעמים כדי למצוא מערכת טובה.
                </p>
              </div>

              <div className="order-2 p-4 lg:p-5 border-t lg:border-t-0 border-border/40 lg:col-start-2 lg:row-start-1 lg:row-span-2">
                <PreferenceToggle 
                  mode={mode}
                  onChangeMode={setMode}
                  maxDays={maxDays}
                  onChangeMaxDays={setMaxDays}
                  excludedDays={excludedDays}
                  onChangeExcludedDays={setExcludedDays}
                  preferredStartTimes={preferredStartTimes}
                  onChangePreferredStartTimes={setPreferredStartTimes}
                  maxOverlapMinutes={maxOverlapMinutes}
                  onChangeMaxOverlapMinutes={setMaxOverlapMinutes}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Area Section: Spans full canvas width below settings */}
        <div className="flex-1 flex flex-col">
          {results?.warnings && (
            (results.warnings.invalid_courses && results.warnings.invalid_courses.length > 0) || 
            results.warnings.has_hard_violations
          ) && (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-500 p-4 rounded-md space-y-2 text-sm max-w-4xl mx-auto">
              <h3 className="font-bold flex items-center gap-2">
                <AlertTriangle size={18} /> אזהרות במערכת
              </h3>
              {results.warnings.invalid_courses && results.warnings.invalid_courses.length > 0 && (
                <p><strong>שגיאה בקורסים:</strong> לא נמצאו הקורסים הבאים: {results.warnings.invalid_courses.join(', ')}</p>
              )}
              {results.warnings.has_hard_violations && (
                <p><strong>אזהרת התנגשויות:</strong> המערכת שנוצרה מכילה התנגשויות או שגיאות קריטיות מכיוון שלא נמצא פתרון מושלם.</p>
              )}
            </div>
          )}

          {results?.warnings?.preferences_met === false && !isGenerating && (() => {
            const issues = results.warnings.preference_issues;
            return (
              <div className="bg-amber-500/10 border border-amber-500/50 text-amber-500 p-4 rounded-md space-y-2 text-sm max-w-4xl mx-auto w-full mb-3 md:mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <AlertTriangle size={18} /> לא נמצאה מערכת שתואמת את כל ההעדפות שלך
                </h3>
                <p>המערכת הפיקה את הפתרון הטוב ביותר שמצאה, אך הוא אינו עומד באילוצים הבאים:</p>
                {issues && (
                  <ul className="list-disc pr-5 space-y-1">
                    {issues.excluded_days_used.length > 0 && (
                      <li>יש שיעורים בימים שסימנת כלא זמינים: {issues.excluded_days_used.join(', ')}</li>
                    )}
                    {issues.exceeds_preferred_days && issues.preferred_num_days !== null && (
                      <li>המערכת דורשת {issues.days_on_campus} ימי הגעה לקמפוס, במקום מקסימום {issues.preferred_num_days} שביקשת</li>
                    )}
                    {issues.early_start_days.map(d => (
                      <li key={d.day}>יום {d.day} מתחיל ב-{d.actual_start}, מוקדם מהשעה המועדפת ({d.preferred_start})</li>
                    ))}
                  </ul>
                )}
                <p className="text-amber-400/90">
                  אם לדעתך קיימת מערכת טובה יותר, מומלץ להריץ את המחולל שוב — כל הרצה עשויה להניב תוצאה שונה.
                </p>
              </div>
            );
          })()}

          {isGenerating ? (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[240px]">
              <Loader2 className="animate-spin text-primary mb-4" size={48} />
              <h3 className="text-xl font-medium">המנוע מחפש את המערכת האופטימלית...</h3>
              <p className="text-textSecondary mt-2">זה עשוי לקחת מספר שניות</p>
            </div>
          ) : results ? (
            <ResultsTable scheduleData={results.schedule} />
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[240px] border-dashed border-2 border-border/50 bg-transparent shadow-none">
              <Calendar size={48} className="text-border mb-3" />
              <h3 className="text-lg font-medium text-textSecondary">המערכת האופטימלית שלך תופיע כאן</h3>
              <p className="text-textSecondary/70 mt-1 text-sm">הגדר את הקורסים והאילוצים בלוח הבקרה העליון ולחץ על היצירה</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>
      <AiAssistantChat isOpen={isAiChatOpen} onToggle={() => setIsAiChatOpen(prev => !prev)} />
    </div>
  );
}

export default App;
