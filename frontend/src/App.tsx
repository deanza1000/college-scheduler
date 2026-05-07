import { useState } from 'react';
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
  const [year, setYear] = useState('2026');
  const [semester, setSemester] = useState('B');

  // Preference State
  const [mode, setMode] = useState<PreferenceMode>('A');
  const [maxDays, setMaxDays] = useState(4);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);

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
      preferred_num_days: mode === 'A' ? maxDays : null
    };

    try {
      const response = await generateSchedule(payload);
      setResults(response);
    } catch (err: any) {
      setError(err.message || "אירעה שגיאה בשרת");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <Calendar size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">מערכת שיבוץ מערכות שעות</h1>
            <p className="text-textSecondary text-sm">הגדר קורסים ואילוצים, ואנחנו נמצא את המערכת האידיאלית עבורך</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 space-y-6">
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
            />

            <div className="card p-6 flex flex-col items-center">
              {error && (
                <div className="w-full bg-danger/10 border border-danger/50 text-danger-light p-3 rounded-md mb-4 flex items-start gap-2 text-sm">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || selectedCourseIds.length === 0}
                className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    מחשב מסלולים...
                  </>
                ) : (
                  "צור מערכת שעות"
                )}
              </button>
              {selectedCourseIds.length === 0 && (
                <p className="text-xs text-textSecondary mt-2 flex items-center gap-1">
                  <Info size={12} /> אנא בחר קורסים לפני יצירת מערכת
                </p>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8 space-y-6">
            {results?.warnings && (
              (results.warnings.invalid_courses && results.warnings.invalid_courses.length > 0) || 
              results.warnings.has_hard_violations
            ) && (
              <div className="bg-amber-500/10 border border-amber-500/50 text-amber-500 p-4 rounded-md space-y-2 text-sm">
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
                <h3 className="text-lg font-medium text-textSecondary">המערכת שלך תופיע כאן</h3>
                <p className="text-textSecondary/70 mt-1 text-sm">בחר קורסים ולחץ על "צור מערכת שעות" כדי להתחיל</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
