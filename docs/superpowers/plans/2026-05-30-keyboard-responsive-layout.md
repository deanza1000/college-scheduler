# Keyboard Controls & Responsive Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full wrap-around keyboard navigation for course selection, a dynamic fit-to-screen desktop layout, and an elegant tabbed schedule view for mobile devices.

**Architecture:** Modify React state for the keyboard listeners in the search header. Use Tailwind CSS flexbox utilities (`h-screen`, `flex-col`, `flex-1`, `min-h-0`) for the desktop layout to automatically size the table. Use Tailwind responsive classes (`hidden md:block` and `block md:hidden`) to seamlessly switch between the full desktop table and the new mobile tabbed view without JS resize listeners.

**Tech Stack:** React, Tailwind CSS, Lucide React (icons)

---

### Task 1: Keyboard Controls (`CourseSelectionHeader.tsx`)

**Files:**
- Modify: `frontend/src/components/CourseSelectionHeader.tsx`

- [ ] **Step 1: Implement Arrow Wrap-Around, Backspace, and Escape Logic**

In `CourseSelectionHeader.tsx`, update the `handleKeyDown` function to handle wrap-around, empty backspaces, and escape clearing. Replace the existing `handleKeyDown` function block:

```tsx
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      } else if (e.key === 'Escape' && search !== '') {
        setSearch('');
        setFocusedIndex(0);
        e.preventDefault();
      } else if (e.key === 'Backspace' && search === '') {
        e.preventDefault();
        if (selectedCourseIds.length > 0) {
          removeCourse(selectedCourseIds[selectedCourseIds.length - 1]);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredCourses.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredCourses.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCourses.length > 0) {
        const validIndex = Math.min(focusedIndex, filteredCourses.length - 1);
        const courseToToggle = filteredCourses[validIndex];
        if (courseToToggle) {
          toggleCourse(courseToToggle.id);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
    } else if (e.key === 'Backspace' && search === '') {
      e.preventDefault();
      if (selectedCourseIds.length > 0) {
        removeCourse(selectedCourseIds[selectedCourseIds.length - 1]);
      }
    }
  };
```

- [ ] **Step 2: Add Shortcut Helper Text Footer**

Inside the dropdown `div` in the return statement of `CourseSelectionHeader.tsx`, add a footer displaying the shortcuts at the very bottom (after the filteredCourses map).

```tsx
          {/* Dropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-surfaceHighlight border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto flex flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-3 text-sm text-textSecondary text-center flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-textSecondary border-t-transparent"></div>
                    טוען קורסים...
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div className="p-3 text-sm text-textSecondary text-center">לא נמצאו קורסים רלוונטיים לסמסטר זה</div>
                ) : (
                  filteredCourses.map((course, index) => {
                    const isSelected = selectedCourseIds.includes(course.id);
                    const isFocused = index === focusedIndex;
                    return (
                      <div
                        key={course.id}
                        className={classNames(
                          "px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-all",
                          isFocused
                            ? "bg-primary/20 border-r-4 border-primary font-medium"
                            : isSelected
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-primary/10",
                          isSelected ? "text-primary" : "text-textPrimary"
                        )}
                        onClick={() => toggleCourse(course.id)}
                      >
                        <div className="flex flex-col">
                          <span>{course.name}</span>
                          <span className="text-xs text-textSecondary">{course.id}</span>
                        </div>
                        {isSelected && <Check size={16} className="text-primary" />}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="sticky bottom-0 bg-surfaceHighlight/95 backdrop-blur-sm border-t border-border/50 p-2 text-[11px] text-textSecondary text-center font-medium shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                ניווט: ↑↓ | בחירה: Enter | סגירה: Esc | מחיקה אחרונה: Backspace
              </div>
            </div>
          )}
```

- [ ] **Step 3: Test and Commit**

Run `npm run build` in the frontend directory to ensure there are no syntax errors. Start the dev server `npm run dev` and test the keyboard navigation manually.

```bash
git add frontend/src/components/CourseSelectionHeader.tsx
git commit -m "feat: add wrap-around keyboard nav and shortcuts to course search"
```


### Task 2: Viewport Architecture (App.tsx)

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Modify Root Container**

In `App.tsx`, change the main outer `div` to `h-screen flex flex-col overflow-hidden`:

Change this:
```tsx
  return (
    <div className="min-h-screen bg-background text-textPrimary p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
```
To this:
```tsx
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-textPrimary p-4 md:p-6 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-4 md:space-y-6">
```

- [ ] **Step 2: Ensure Children Headers don't Shrink**

Add `shrink-0` to the header, accordion wrapper, and dashboard action strip to ensure they maintain their height when the calendar flexes.

Change `<header className="flex items-center gap-4 pb-4 border-b border-border">` to:
`<header className="flex items-center gap-4 pb-4 border-b border-border shrink-0">`

Change `<div className="card overflow-hidden transition-all duration-300 border border-border/80 bg-surface/50 backdrop-blur-md">` to:
`<div className="card shrink-0 overflow-hidden transition-all duration-300 border border-border/80 bg-surface/50 backdrop-blur-md">`

Change `<div className="card p-6 bg-surfaceHighlight/30 border-primary/20 flex flex-col items-center justify-center gap-4">` to:
`<div className="card shrink-0 p-6 bg-surfaceHighlight/30 border-primary/20 flex flex-col items-center justify-center gap-4">`

- [ ] **Step 3: Modify Results Wrapper to be Flex**

Change the div wrapping the ResultsArea (`<div className="space-y-6 pt-4">`) to fill the remaining height:

```tsx
        {/* Results Area Section: Spans full canvas width below settings */}
        <div className="flex-1 flex flex-col min-h-0 pt-2 pb-2">
          {results?.warnings && ( ...
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: migrate app layout to strict flex viewport to support fit-to-screen calendar"
```


### Task 3: Desktop Dynamic Height & Mobile Tabs (`ResultsTable.tsx`)

**Files:**
- Modify: `frontend/src/components/ResultsTable.tsx`

- [ ] **Step 1: Introduce `selectedDay` State**

At the top of `ResultsTable.tsx`, add the state variable for the mobile tab view:

```tsx
  const [selectedDay, setSelectedDay] = useState<string>('א');
```

- [ ] **Step 2: Make the Table Flex-Fit**

Modify the main container and the table to utilize `h-full`. Add the mobile-hide class `hidden md:flex`. Change:

```tsx
      <div ref={tableRef} className="card overflow-hidden p-2 bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1000px] border border-border/40">
```
To:
```tsx
      {/* Desktop View: Full Grid */}
      <div ref={tableRef} className="hidden md:flex flex-col flex-1 card overflow-hidden p-2 bg-surface min-h-[400px]">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full h-full border-collapse min-w-[1000px] border border-border/40">
```
*(Ensure to update the outermost container of ResultsTable `div className="space-y-4" dir="rtl"` to `div className="flex-1 flex flex-col min-h-0 space-y-4" dir="rtl"`)*

- [ ] **Step 3: Create Mobile Tabbed Daily View**

Append the mobile view code right below the `</div>` that closes the Desktop View (inside the root `ResultsTable` return div).

```tsx
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
```

- [ ] **Step 4: Update Global CSS for Mobile Tabs (`index.css`)**

To ensure the tabs scroll nicely on mobile without an ugly scrollbar, add a `.hide-scrollbar` utility to `frontend/src/index.css`:

```css
@layer utilities {
  .transition-height {
    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out;
  }
  
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 5: Test and Commit**

Run `npm run build` and visually test the desktop scaling and the mobile view using responsive DevTools.

```bash
git add frontend/src/components/ResultsTable.tsx frontend/src/index.css
git commit -m "feat: add flex-fit desktop table sizing and tabbed day view for mobile"
```
