import { useState, useEffect, useRef } from 'react';
import { fetchCourses } from '../api/client';
import type { Course } from '../api/client';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { classNames } from '../utils/helpers';

interface CourseSelectionHeaderProps {
  selectedCourseIds: string[];
  onChangeCourses: (ids: string[]) => void;
  year: string;
  onChangeYear: (val: string) => void;
  semester: string;
  onChangeSemester: (val: string) => void;
}

export function CourseSelectionHeader({
  selectedCourseIds,
  onChangeCourses,
  year,
  onChangeYear,
  semester,
  onChangeSemester
}: CourseSelectionHeaderProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>(['2026']);
  const [courseNameCache, setCourseNameCache] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastFetchedRef = useRef({ year: '', semester: '' });


  useEffect(() => {
    // Avoid redundant fetches if we have already fetched for the current specific term
    if (year && semester && lastFetchedRef.current.year === year && lastFetchedRef.current.semester === semester) {
      return;
    }

    fetchCourses(year || undefined, semester || undefined)
      .then(res => {
        if (!res || !Array.isArray(res.courses)) {
          console.error("Invalid response from fetchCourses:", res);
          return;
        }
        lastFetchedRef.current = { year: res.year || '', semester: res.semester || '' };
        setCourses(res.courses);

        // Update cache of course names so selected IDs from other terms still render beautifully
        setCourseNameCache(prev => {
          const next = { ...prev };
          res.courses.forEach(c => {
            if (c && c.id) {
              next[c.id] = c.name;
            }
          });
          return next;
        });

        if (Array.isArray(res.available_years) && res.available_years.length > 0) {
          setAvailableYears(res.available_years);
        }
        if (res.year && year !== res.year) {
          onChangeYear(res.year);
        }
        if (res.semester && semester !== res.semester) {
          onChangeSemester(res.semester);
        }
      })
      .catch(err => console.error("Failed to fetch courses:", err));
  }, [year, semester, onChangeYear, onChangeSemester]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCourse = (id: string) => {
    if (selectedCourseIds.includes(id)) {
      onChangeCourses(selectedCourseIds.filter(c => c !== id));
    } else {
      onChangeCourses([...selectedCourseIds, id]);
      setSearch('');
      setFocusedIndex(0);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const removeCourse = (id: string) => {
    onChangeCourses(selectedCourseIds.filter(c => c !== id));
  };

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.includes(search)
  );

  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredCourses.length > 0) {
      const validIndex = Math.min(focusedIndex, filteredCourses.length - 1);
      const activeItem = dropdownRef.current.children[validIndex] as HTMLElement;
      if (activeItem && activeItem.scrollIntoView) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen, filteredCourses.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredCourses.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
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
    }
  };

  return (
    <div className="card p-6 flex flex-col gap-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold mb-4">בחר קורסים</h2>

        <div className="relative" ref={wrapperRef}>
          {/* Multi-select input area */}
          <div
            className="input-base min-h-[42px] flex flex-wrap gap-2 items-center cursor-text"
            onClick={() => {
              setIsOpen(true);
              inputRef.current?.focus();
            }}
          >
            {selectedCourseIds.map(id => {
              const name = courseNameCache[id] || id;
              return (
                <span key={id} className="bg-primary/20 text-primary-light px-2 py-1 rounded-md text-sm flex items-center gap-1 border border-primary/30">
                  {name}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeCourse(id); }}
                    className="hover:text-danger hover:bg-danger/10 rounded-full p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
            <input
              ref={inputRef}
              type="text"
              className="bg-transparent border-none outline-none flex-1 min-w-[120px] text-sm"
              placeholder={selectedCourseIds.length === 0 ? "חפש קורס..." : ""}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(0);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              dir="rtl"
            />
            <ChevronsUpDown size={16} className="text-textSecondary ml-2" />
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-surfaceHighlight border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {filteredCourses.length === 0 ? (
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
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-textSecondary mb-1">שנת לימודים</label>
          <select
            className="input-base"
            value={year}
            onChange={(e) => onChangeYear(e.target.value)}
            dir="rtl"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-textSecondary mb-1">סמסטר</label>
          <select
            className="input-base"
            value={semester}
            onChange={(e) => onChangeSemester(e.target.value)}
            dir="rtl"
          >
            <option value="A">א' (חורף)</option>
            <option value="B">ב' (אביב)</option>
            <option value="Summer">קיץ</option>
          </select>
        </div>
      </div>
    </div>
  );
}
