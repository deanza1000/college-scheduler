# Design Specification: Professor Orca UI/UX Overhaul

This document details the visual redesign and functional polish of the **Professor Orca (Israel College Scheduler)** frontend.

## Goals

1. **Modern Minimalist Slate Design**: Upgrade the interface from plain dark cards to a high-density, beautifully styled layout utilizing soft pastel color accents, micro-transitions, and sleek borders.
2. **Collapsible Workspace Accordion**: Introduce an elegant collapsible container for all filters, courses, and preference controls, maximizing vertical real estate and focus on the generated calendar.
3. **Weekly Calendar Card Redesign**: Transform the calendar results view into a premium interactive grid utilizing soft pastel themed course blocks, custom hover states, conflict indicators, and pixel-perfect screenshots.
4. **Action Bar & Loading Improvements**: Restyle action buttons, loading states, and error alerts to feel premium and responsive.

---

## Technical Specifications & UI Changes

### 1. Global Themes & Layout Styles

We will modernize the global styling system using a highly cohesive **Zinc-Slate Dark palette** paired with **Muted Soft Pastel accents** for courses.

* **Palette Variables (Tailwind & CSS)**:
  * Background: `#09090b` (Zinc-950)
  * Surface/Cards: `#18181b` (Zinc-900)
  * Highlight Surface: `#27272a` (Zinc-800)
  * Borders: `#27272a` (Zinc-800) or `#3f3f46` (Zinc-700)
  * Custom Soft Pastel Course Colors (9 Themes):
    1. **Blue**: bg: `bg-blue-500/10`, border: `border-blue-500/30`, text: `text-blue-300`, flat-badge: `bg-blue-500/20 text-blue-300`
    2. **Amber**: bg: `bg-amber-500/10`, border: `border-amber-500/30`, text: `text-amber-300`, flat-badge: `bg-amber-500/20 text-amber-300`
    3. **Green**: bg: `bg-emerald-500/10`, border: `border-emerald-500/30`, text: `text-emerald-300`, flat-badge: `bg-emerald-500/20 text-emerald-300`
    4. **Purple**: bg: `bg-purple-500/10`, border: `border-purple-500/30`, text: `text-purple-300`, flat-badge: `bg-purple-500/20 text-purple-300`
    5. **Rose**: bg: `bg-rose-500/10`, border: `border-rose-500/30`, text: `text-rose-300`, flat-badge: `bg-rose-500/20 text-rose-300`
    6. **Teal**: bg: `bg-teal-500/10`, border: `border-teal-500/30`, text: `text-teal-300`, flat-badge: `bg-teal-500/20 text-teal-300`
    7. **Indigo**: bg: `bg-indigo-500/10`, border: `border-indigo-500/30`, text: `text-indigo-300`, flat-badge: `bg-indigo-500/20 text-indigo-300`
    8. **Orange**: bg: `bg-orange-500/10`, border: `border-orange-500/30`, text: `text-orange-300`, flat-badge: `bg-orange-500/20 text-orange-300`
    9. **Fuchsia**: bg: `bg-fuchsia-500/10`, border: `border-fuchsia-500/30`, text: `text-fuchsia-300`, flat-badge: `bg-fuchsia-500/20 text-fuchsia-300`

---

### 2. Collapsible Settings Stack (`App.tsx`)

* **New State**:
  * `const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);`
* **Layout Structure**:
  * Wrap `CourseSelectionHeader` and `PreferenceToggle` in a sliding container with smooth height transitions (`transition-all duration-300 ease-in-out`).
  * Add a gorgeous compact Header Strip that appears when collapsed, summarizing active settings:
    * *Example (RTL)*: `שנת לימודים: 2026 | סמסטר א' | 4 קורסים נבחרו`
  * Add an elegant Chevron-based toggle button to expand or collapse manually.
* **Auto-Collapse Behavior**:
  * Inside `handleGenerate()`, when loading completes and a valid schedule is received, trigger `setIsSettingsExpanded(false)` automatically to collapse the filters and maximize screen width for the weekly calendar.

---

### 3. High-Density Interactive Filters (`CourseSelectionHeader.tsx` & `PreferenceToggle.tsx`)

* **Search Dropdown & Badges**:
  * Selected course badges will use the soft-pastel palette based on their index. Badges will include a hover-zoom and dynamic spin animation on the "x" remove icon.
  * Search dropdown item hover states will have subtle glass scaling and dynamic side border highlighting.
* **Preferences Exclusions Grid**:
  * Re-design the Available/Unavailable day exclusion toggles:
    * Available: Neutral slate card with flat border, subtle hover highlight.
    * Unavailable (Excluded): Soft pastel red background (`bg-red-500/10 border-red-500/30 text-red-400`) with a clean `לא פנוי` tag.
  * Render a sleek custom slider for max-days selection using deep-purple or blue accents.

---

### 4. Re-engineered Weekly Calendar Representation (`ResultsTable.tsx` & `CourseCard.tsx`)

* **Responsive Weekly Schedule**:
  * Render a grid featuring hour columns on the right (RTL layout) and days horizontally.
  * Adjust row layout so hours span evenly, aligning course sessions exactly with their start and end time boundaries.
* **Soft Pastel Course Cards**:
  * Course sessions will be color-coded using the soft pastel palette matching their search badge indexes.
  * Inside cards, include sleek, micro-styled icons (`Clock`, `MapPin`, `User`, `BookOpen`) for details.
  * Add conflict tags (`התנגשות`) with modern glowing indicators if multiple lectures overlap.
* **Export Action Strip**:
  * Integrate an improved layout containing the loading status and the capture logic.
  * When generating: change submit text to `"מייצר מערכת שעות אופטימלית..."` with a premium loader.
  * Capture logic: restyle the **"שמור תמונה"** button to look like a premium tool, and invoke `html2canvas` to capture the schedule grid seamlessly with clean canvas styles.

---

## Verification & Review

### Manual Verification
1. Open the local application.
2. Select 2-3 courses and add constraints.
3. Verify that search badges are color-coded in soft pastels.
4. Click "צור מערכת שעות אופטימלית".
5. Verify that the loading animation displays `"מייצר מערכת שעות אופטימלית..."`.
6. Verify that the filters panel collapses automatically once results are returned.
7. Tweak and expand filters manually using the accordion header.
8. Verify that the weekly calendar card has gorgeous styling, proper RTL alignment, and clear hover/conflict details.
9. Click "שמור תמונה" and confirm that a beautiful PNG downloads successfully.
