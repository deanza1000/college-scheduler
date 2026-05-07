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
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const toggleCourse = (id: string) => {
    if (selectedCourseIds.includes(id)) {
      onChangeCourses(selectedCourseIds.filter(c => c !== id));
    } else {
      onChangeCourses([...selectedCourseIds, id]);
    }
  };

  const removeCourse = (id: string) => {
    onChangeCourses(selectedCourseIds.filter(c => c !== id));
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.id.includes(search)
  );

  return (
    <div className="card p-6 flex flex-col gap-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold mb-4">בחר קורסים</h2>
        
        <div className="relative" ref={wrapperRef}>
          {/* Multi-select input area */}
          <div 
            className="input-base min-h-[42px] flex flex-wrap gap-2 items-center cursor-text"
            onClick={() => setIsOpen(true)}
          >
            {selectedCourseIds.map(id => {
              const course = courses.find(c => c.id === id);
              return (
                <span key={id} className="bg-primary/20 text-primary-light px-2 py-1 rounded-md text-sm flex items-center gap-1 border border-primary/30">
                  {course ? course.name : id}
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
              type="text"
              className="bg-transparent border-none outline-none flex-1 min-w-[120px] text-sm"
              placeholder={selectedCourseIds.length === 0 ? "חפש קורס..." : ""}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsOpen(true)}
              dir="rtl"
            />
            <ChevronsUpDown size={16} className="text-textSecondary ml-2" />
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surfaceHighlight border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredCourses.length === 0 ? (
                <div className="p-3 text-sm text-textSecondary text-center">לא נמצאו קורסים</div>
              ) : (
                filteredCourses.map(course => {
                  const isSelected = selectedCourseIds.includes(course.id);
                  return (
                    <div
                      key={course.id}
                      className={classNames(
                        "px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 flex items-center justify-between",
                        isSelected ? "bg-primary/5 text-primary" : "text-textPrimary"
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
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
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
