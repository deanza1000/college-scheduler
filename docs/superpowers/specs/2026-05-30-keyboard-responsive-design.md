# Design Specification: Keyboard Controls & Responsive Calendar

This document details the design for improving keyboard navigation within the course search interface and implementing a responsive, scroll-free layout for the weekly schedule on desktop and mobile.

## Goals

1. **Enhanced Keyboard Navigation**: Make the course selection dropdown fully operable via keyboard, including wrap-around capabilities and quick deletions.
2. **Desktop Dashboard Layout**: Ensure the generated weekly calendar scales dynamically to fit perfectly within the viewport on PCs and laptops, eliminating the need for vertical scrolling.
3. **Preference Accommodation**: Ensure the layout handles the expandable preferences and settings sections gracefully. When expanded, there must be enough space for the preferences, and the table must adjust correctly or provide a scrolling fallback if viewport space becomes too constricted.
4. **Mobile Tabbed View**: Replace the squished multi-day grid with an elegant, tabbed daily timeline optimized for mobile screens.

---

## Technical Specifications & UI Changes

### 1. Keyboard Controls (`CourseSelectionHeader.tsx`)

* **Wrap-Around Navigation**:
  * Modify the `handleKeyDown` logic for `ArrowDown`: if the focused index is at the last item, wrap around to index `0`.
  * For `ArrowUp`: if the focused index is `0`, wrap around to the last item.
* **Quick Backspace Delete**:
  * Add a check for `e.key === 'Backspace'`. If `search === ''` (the text input is completely empty) and there are currently selected courses, pop (remove) the last course from the `selectedCourseIds` array.
* **Escape Behavior**:
  * `Escape` when the dropdown is open: Closes the dropdown.
  * `Escape` when the dropdown is closed: Clears the current search input text and resets the focused index.
* **Shortcut Helper Text**:
  * Add a sticky footer to the dropdown menu containing a beautifully styled, subtle shortcut hint text: 
    * `ניווט: ↑↓ | בחירה: Enter | סגירה: Esc | מחיקה: Backspace`

### 2. Desktop Flex-Fit Layout (`App.tsx` & `ResultsTable.tsx`)

* **Viewport Architecture (`App.tsx`)**:
  * Modify the main app wrapper container to lock to the viewport height: `h-screen flex flex-col overflow-hidden` (replacing `min-h-screen`).
  * The header, settings accordion, and generate action strip will maintain their natural heights. 
  * The settings accordion will continue to auto-collapse upon generating a successful schedule, freeing up maximum vertical space.
  * The results container below the action strip will become a fluid flex container: `flex-1 min-h-0 flex flex-col overflow-hidden`.
  * **Preference Fallback**: Inside the results wrapper, we will ensure a minimum height (`min-h-[400px]`) with vertical scrolling so that if the user manually opens the preferences accordion on a small laptop screen, the table remains usable rather than shrinking to an unreadable sliver.
* **Dynamic Table Height (`ResultsTable.tsx`)**:
  * The `ResultsTable` container will utilize `flex-1` to fill the available area.
  * The `<table>` structure and its rows (`tr`) will use height distribution (via `h-full` or Flexbox) so that the hours scale uniformly to precisely fill the container's height. This guarantees the "no scroll" desktop experience when the preferences accordion is collapsed.

### 3. Mobile Tabbed Day View (`ResultsTable.tsx`)

* **Responsive Rendering**:
  * Implement a responsive breakpoint check to detect mobile screens (`max-width: 767px`, corresponding to Tailwind's default behavior below `md:`).
* **Tabbed Navigation Component**:
  * Render a horizontal row of interactive tabs displaying the days: `א'`, `ב'`, `ג'`, `ד'`, `ה'`, `ו'`.
  * Maintain a `selectedDay` state defaulting to the first day that has scheduled classes.
* **Daily Timeline Rendering**:
  * Instead of rendering the multi-day HTML table, the component will map the schedule events for the active `selectedDay` chronologically.
  * Each session will be displayed as an elegant vertical card detailing the time slot, course name, and location/instructor.
  * If the selected day has no classes, a clean empty state message ("אין שיעורים ביום זה") will be displayed.
