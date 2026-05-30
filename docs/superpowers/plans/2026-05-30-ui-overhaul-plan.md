# Professor Orca UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Professor Orca UI into a premium, modern, high-density Zinc-Slate dashboard utilizing soft pastel colored accents, dynamic collapse transitions, and pixel-perfect schedule export capabilities.

**Architecture:** We will introduce a React state-controlled collapsible header workspace for user inputs, map stable color themes from CourseCards directly into course selection search badges, restyle constraints/preference controls, and structure a gorgeous Weekly Calendar Schedule Grid with detailed hover overlays, conflict visualization, and image export.

**Tech Stack:** React, TailwindCSS v3, Lucide Icons, html2canvas, TypeScript.

---

### Task 1: CSS Variables & Smooth Transitions Redesign

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Update Tailwind Config with customized colors and transitions**
  Modify: [tailwind.config.js](file:///home/deanza/Documents/scheduler/frontend/tailwind.config.js) to extend soft slate colors and support modern layout transitions.
  ```javascript
  colors: {
    background: '#09090b', // Zinc 950
    surface: '#18181b', // Zinc 900
    surfaceHighlight: '#27272a', // Zinc 800
    primary: '#3b82f6', // Blue 500
    primaryHover: '#2563eb', // Blue 600
    textPrimary: '#f4f4f5', // Zinc 50
    textSecondary: '#a1a1aa', // Zinc 400
    border: '#27272a', // Zinc 800 (sleeker borders)
    danger: '#ef4444', // Red 500
    dangerHover: '#dc2626',
    success: '#22c55e', // Green 500
  }
  ```

- [ ] **Step 2: Add CSS utility classes for glassmorphic elements and pastels**
  Modify: [index.css](file:///home/deanza/Documents/scheduler/frontend/src/index.css) to add smooth layout height transitions and border-effects.
  ```css
  @layer utilities {
    .transition-height {
      transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out;
    }
  }
  ```

- [ ] **Step 3: Verify build compiles cleanly**
  Run: `npm run build` in directory `/home/deanza/Documents/scheduler/frontend`
  Expected: Command runs and completes with no TypeScript or PostCSS errors.

---

### Task 2: Collapsible Settings Workspace Accordion

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Introduce Collapsible Panel State & Toggle Logic**
  Modify: [App.tsx](file:///home/deanza/Documents/scheduler/frontend/src/App.tsx) to add the `isSettingsExpanded` state and create the header panel summary layout.
  
  Add State at top of App function:
  ```typescript
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
  ```

  Update the JSX layout around `CourseSelectionHeader` and `PreferenceToggle` to wrap them in an accordion wrapper:
  ```tsx
  {/* Collapsible Header Accordion Strip */}
  <div className="card overflow-hidden transition-all duration-300 border border-border/80 bg-surface/50 backdrop-blur-md">
    <div 
      className="p-4 flex items-center justify-between cursor-pointer hover:bg-surfaceHighlight/20 transition-colors"
      onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-textPrimary m-0">הגדרות ואילוצים</h2>
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
      <button className="text-textSecondary hover:text-textPrimary transition-colors p-1">
        <span className={`block transform transition-transform duration-300 ${isSettingsExpanded ? 'rotate-180' : 'rotate-0'}`}>
          ▼
        </span>
      </button>
    </div>

    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isSettingsExpanded ? 'max-h-[1200px] opacity-100 border-t border-border/50 p-6' : 'max-h-0 opacity-0'}`}>
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
    </div>
  </div>
  ```

- [ ] **Step 2: Add Auto-Collapse on Generation Success**
  Modify: [App.tsx](file:///home/deanza/Documents/scheduler/frontend/src/App.tsx) inside the `handleGenerate` method, automatically close the settings stack on success:
  ```typescript
  try {
    const response = await generateSchedule(payload);
    setResults(response);
    setIsSettingsExpanded(false); // Auto-collapse settings drawer
  }
  ```

- [ ] **Step 3: Update submit button and loader texts**
  Modify: [App.tsx](file:///home/deanza/Documents/scheduler/frontend/src/App.tsx) to describe "creating schedule" rather than "calculating paths":
  ```tsx
  {isGenerating ? (
    <>
      <Loader2 className="animate-spin" size={22} />
      מייצר מערכת שעות אופטימלית...
    </>
  ) : (
    "צור מערכת שעות אופטימלית"
  )}
  ```

---

### Task 3: Color-Coded Course Search Badges

**Files:**
- Modify: `frontend/src/components/CourseSelectionHeader.tsx`

- [ ] **Step 1: Import Color Themes & Apply Dynamic Styles to Selection Badges**
  Modify: [CourseSelectionHeader.tsx](file:///home/deanza/Documents/scheduler/frontend/src/components/CourseSelectionHeader.tsx) to import `COURSE_COLOR_THEMES` and assign course-specific pastel badges based on index.
  
  Import top of file:
  ```typescript
  import { COURSE_COLOR_THEMES } from './CourseCard';
  ```

  Update badging layout inside JSX (lines 172-185):
  ```tsx
  {selectedCourseIds.map((id, idx) => {
    const name = courseNameCache[id] || id;
    const theme = COURSE_COLOR_THEMES[idx % COURSE_COLOR_THEMES.length];
    return (
      <span key={id} className={classNames(theme.bg, theme.text, theme.border, "px-2 py-1 rounded-md text-sm flex items-center gap-1.5 border transition-all hover:scale-102")}>
        {name}
        <button
          onClick={(e) => { e.stopPropagation(); removeCourse(id); }}
          className="hover:text-danger hover:bg-danger/10 rounded-full p-0.5 transition-colors"
        >
          <X size={13} className="transition-transform duration-200 hover:rotate-90" />
        </button>
      </span>
    );
  })}
  ```

---

### Task 4: Premium Restyling of Preference Constraints Toggles

**Files:**
- Modify: `frontend/src/components/PreferenceToggle.tsx`

- [ ] **Step 1: Upgrade Day Exclusion Buttons with Excluded/Available States**
  Modify: [PreferenceToggle.tsx](file:///home/deanza/Documents/scheduler/frontend/src/components/PreferenceToggle.tsx) to use Soft Pastel coloring for excluded days and sleeker layouts.
  ```tsx
  className={classNames(
    "flex-1 min-w-[85px] py-3 rounded-md border text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 shadow-sm",
    isExcluded 
      ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]" 
      : "bg-surfaceHighlight/40 border-border/80 text-textSecondary hover:border-primary/50 hover:text-textPrimary hover:bg-surfaceHighlight/80"
  )}
  ```

---

### Task 5: Weekly Calendar Representation & Pixel-Perfect Export Redesign

**Files:**
- Modify: `frontend/src/components/ResultsTable.tsx`
- Modify: `frontend/src/components/CourseCard.tsx`

- [ ] **Step 1: Align Weekday Headers & Hours RTL Grid**
  Modify: [ResultsTable.tsx](file:///home/deanza/Documents/scheduler/frontend/src/components/ResultsTable.tsx) to display clean column lines, responsive widths, and updated layout margins.
  ```tsx
  <table className="w-full border-collapse min-w-[1000px] border border-border/40">
  ```

- [ ] **Step 2: Restyle CourseCard elements with Glassmorphism and detailed items**
  Modify: [CourseCard.tsx](file:///home/deanza/Documents/scheduler/frontend/src/components/CourseCard.tsx) to ensure Soft Pastel card styling compiles cleanly with subtle flat margins and premium layouts:
  ```tsx
  className={classNames(
    "p-3 rounded-md border border-r-4 text-xs sm:text-sm flex flex-col gap-2 relative h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
    theme.bg,
    theme.border,
    theme.accent,
    isConflict && "border-danger ring-1 ring-danger shadow-[0_0_10px_rgba(239,68,68,0.2)]"
  )}
  ```

- [ ] **Step 3: Restyle screenshot print button and background background capture canvas**
  Modify: [ResultsTable.tsx](file:///home/deanza/Documents/scheduler/frontend/src/components/ResultsTable.tsx) to use professional Zinc colors during image download:
  ```typescript
  const canvas = await html2canvas(tableRef.current, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#09090b', // match premium zinc-950 dark background
  });
  ```

- [ ] **Step 4: Verify complete application builds and tests cleanly**
  Run: `npm run build` inside `frontend` directory.
  Expected: Successful clean build with zero warnings or compilation errors.

---

## Verification Plan

### Automated Tests
- Command: `npm run build` inside `/home/deanza/Documents/scheduler/frontend`
- Verification: Ensures build compiles successfully.

### Manual Verification
1. Open local dev site (`npm run dev`) and test course multi-search badges. Badges should render in beautiful dynamic pastels.
2. Select course IDs and preferences, then hit **"צור מערכת שעות אופטימלית"**.
3. Verify button loader text displays `"מייצר מערכת שעות אופטימלית..."`.
4. Once results load, verify that the configuration panel auto-collapses smoothly.
5. Verify weekly schedule visual grid blocks align properly with weekday columns and times.
6. Verify "שמור תמונה" downloads the schedule PNG perfectly with Zinc dark styling backgrounds.
