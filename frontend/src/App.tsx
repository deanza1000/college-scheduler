import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { CourseSelectionHeader } from './components/CourseSelectionHeader';
import { PreferenceToggle } from './components/PreferenceToggle';
import type { PreferenceMode } from './components/PreferenceToggle';
import { ResultsTable } from './components/ResultsTable';
import { generateSchedule } from './api/client';
import type { ScheduleResponse, ScheduleRequest } from './api/client';
import { Calendar, Loader2, AlertTriangle, Info } from 'lucide-react';

function App() {
  // Course Header State
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');

  // Preference State
  const [mode, setMode] = useState<PreferenceMode>('A');
  const [maxDays, setMaxDays] = useState(4);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const [preferredStartTimes, setPreferredStartTimes] = useState<Record<string, string>>({});

  // Solving State
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

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
      turnstile_token: turnstileToken
    };

    try {
      const response = await generateSchedule(payload);
      setResults(response);
    } catch (err: any) {
      setError(err.message || "אירעה שגיאה בשרת");
    } finally {
      setIsGenerating(false);
      setTurnstileToken(null);
      setTurnstileKey(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center gap-4 pb-4 border-b border-border">
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

        {/* Top Controls Dashboard: Spacious double column configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CourseSelectionHeader 
            selectedCourseIds={selectedCourseIds}
            onChangeCourses={setSelectedCourseIds}
            year={year}
            onChangeYear={setYear}
            semester={semester}
            onChangeSemester={setSemester}
          />

          <PreferenceToggle 
            mode={mode}
            onChangeMode={setMode}
            maxDays={maxDays}
            onChangeMaxDays={setMaxDays}
            excludedDays={excludedDays}
            onChangeExcludedDays={setExcludedDays}
            preferredStartTimes={preferredStartTimes}
            onChangePreferredStartTimes={setPreferredStartTimes}
          />
        </div>

        {/* Centralized Action Dashboard Strip */}
        <div className="card p-6 bg-surfaceHighlight/30 border-primary/20 flex flex-col items-center justify-center gap-4">
          {error && (
            <div className="w-full max-w-2xl bg-danger/10 border border-danger/50 text-danger-light p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="w-full max-w-md flex flex-col items-center gap-5 mx-auto">
            {/* Submit Trigger Action */}
            <div className="w-full">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || selectedCourseIds.length === 0 || !turnstileToken}
                className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    מחשב מסלולים אופטימליים...
                  </>
                ) : (
                  "צור מערכת שעות אופטימלית"
                )}
              </button>
              {selectedCourseIds.length === 0 && (
                <p className="text-xs text-textSecondary mt-2 text-center flex items-center justify-center gap-1">
                  <Info size={12} /> אנא בחר קורסים מהרשימה העליונה לפני היצירה
                </p>
              )}
              <p className="text-xs text-textSecondary/80 mt-3 text-center flex items-center justify-center gap-1">
                <Info size={14} className="text-primary-light shrink-0" />
                שימו לב: המערכת יכולה להפיק מערכת שעות שאינה אופטימלית, ומיועדת להרצה מספר פעמים כדי למצוא מערכת טובה.
              </p>
            </div>

            {/* Seamlessly Integrated Cloudflare Turnstile Verification Area */}
            <div className="w-full flex flex-col items-center justify-center pt-1">
              <div className="inline-flex flex-col items-center rounded-xl bg-background/50 p-2 border border-border/40 shadow-inner backdrop-blur-sm max-w-full overflow-hidden transition-all duration-300 hover:border-border/80" dir="ltr">
                <Turnstile
                  key={turnstileKey}
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setError("אימות האבטחה נכשל. אנא נסה שוב.")}
                  options={{
                    theme: 'dark',
                    size: 'flexible'
                  }}
                />
              </div>
              <div className="mt-2 text-center h-4 flex items-center justify-center">
                {!turnstileToken ? (
                  <span className="text-xs text-amber-500/90 flex items-center gap-1.5 font-medium animate-pulse" dir="rtl">
                    <Info size={13} className="shrink-0" /> מוודא חיבור מאובטח לפני שליחה...
                  </span>
                ) : (
                  <span className="text-xs text-success/90 flex items-center gap-1.5 font-medium" dir="rtl">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" /> חיבור מאובטח ומאומת
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Area Section: Spans full canvas width below settings */}
        <div className="space-y-6 pt-4">
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

          {isGenerating ? (
            <div className="card p-12 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="animate-spin text-primary mb-4" size={48} />
              <h3 className="text-xl font-medium">המנוע מחפש את המערכת האופטימלית...</h3>
              <p className="text-textSecondary mt-2">זה עשוי לקחת מספר שניות</p>
            </div>
          ) : results ? (
            <ResultsTable scheduleData={results.schedule} />
          ) : (
            <div className="card p-12 flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-border/50 bg-transparent shadow-none">
              <Calendar size={64} className="text-border mb-4" />
              <h3 className="text-lg font-medium text-textSecondary">המערכת האופטימלית שלך תופיע כאן</h3>
              <p className="text-textSecondary/70 mt-1 text-sm">הגדר את הקורסים והאילוצים בלוח הבקרה העליון ולחץ על היצירה</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
