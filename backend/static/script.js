document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('schedule-form');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = form.querySelector('.btn-text');
    const spinner = document.getElementById('loading-spinner');
    const resultsSection = document.getElementById('results-section');
    const scheduleContainer = document.getElementById('schedule-container');
    const warningsContainer = document.getElementById('warnings-container');

    const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI State: Loading
        btnText.textContent = 'מחשב מסלולים...';
        spinner.classList.remove('hidden');
        generateBtn.disabled = true;
        resultsSection.classList.add('hidden');
        warningsContainer.classList.add('hidden');
        warningsContainer.innerHTML = '';

        // Gather Data
        const formData = new FormData(form);
        const year = formData.get('year');
        const semester = formData.get('semester');
        const courseIdsInput = formData.get('course_ids');
        
        // Parse course IDs safely (handle spaces or commas)
        const course_ids = courseIdsInput.split(/[\s,]+/).filter(id => id.trim() !== '');
        
        const exclude_days = formData.getAll('exclude');
        let preferred_num_days = formData.get('preferred_num_days');
        
        if (preferred_num_days) {
            preferred_num_days = parseInt(preferred_num_days);
        } else {
            preferred_num_days = null;
        }

        const payload = {
            year,
            semester,
            course_ids,
            exclude_days,
            preferred_num_days
        };

        try {
            const response = await fetch('/api/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'אירעה שגיאה בשרת');
            }

            renderSchedule(data.schedule);
            renderWarnings(data.warnings);
            
            resultsSection.classList.remove('hidden');
            
            // Scroll to results smoothly
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            alert(`שגיאה: ${error.message}`);
        } finally {
            // Restore UI State
            btnText.textContent = 'צור מערכת שעות';
            spinner.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });

    function renderWarnings(warnings) {
        if (!warnings) return;
        
        let html = '';
        
        if (warnings.invalid_courses && warnings.invalid_courses.length > 0) {
            html += `<p><strong>שגיאה בקורסים:</strong> לא נמצאו הקורסים הבאים: ${warnings.invalid_courses.join(', ')}</p>`;
        }
        
        if (warnings.has_hard_violations) {
            html += `<p><strong>אזהרת התנגשויות:</strong> המערכת שנוצרה מכילה התנגשויות או שגיאות קריטיות מכיוון שלא נמצא פתרון מושלם.</p>`;
        }
        
        if (html) {
            warningsContainer.innerHTML = html;
            warningsContainer.classList.remove('hidden');
        }
    }

    function renderSchedule(scheduleData) {
        scheduleContainer.innerHTML = '';

        if (Object.keys(scheduleData).length === 0) {
            scheduleContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">לא נמצאו שיעורים לשבץ או שהמערכת ריקה.</p>';
            return;
        }

        // Find all unique times across all days
        const allTimes = new Set();
        Object.values(scheduleData).forEach(dayEvents => {
            dayEvents.forEach(event => {
                allTimes.add(event.start_time);
            });
        });

        // Sort times chronologically
        const sortedTimes = Array.from(allTimes).sort((a, b) => {
            const [ha, ma] = a.split(':').map(Number);
            const [hb, mb] = b.split(':').map(Number);
            return (ha * 60 + ma) - (hb * 60 + mb);
        });

        // Group data by time -> day -> events array
        const tableData = {};
        sortedTimes.forEach(t => {
            tableData[t] = {};
            daysOfWeek.forEach(d => { tableData[t][d] = []; });
        });

        Object.entries(scheduleData).forEach(([day, events]) => {
            if (daysOfWeek.includes(day)) {
                events.forEach(event => {
                    const t = event.start_time;
                    tableData[t][day].push(event);
                });
            }
        });

        // Build HTML Table
        const table = document.createElement('table');
        table.className = 'schedule-table';

        // Header Row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const timeTh = document.createElement('th');
        timeTh.className = 'time-col';
        timeTh.textContent = 'שעה';
        headerRow.appendChild(timeTh);

        daysOfWeek.forEach(day => {
            const th = document.createElement('th');
            th.className = 'day-col';
            th.textContent = `'${day}`;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body Rows
        const tbody = document.createElement('tbody');

        sortedTimes.forEach(t => {
            const rowEvents = tableData[t];
            
            // Find max overlapping events in this time slot across all days
            let maxEvents = 1;
            daysOfWeek.forEach(d => {
                if (rowEvents[d].length > maxEvents) {
                    maxEvents = rowEvents[d].length;
                }
            });

            for (let i = 0; i < maxEvents; i++) {
                const tr = document.createElement('tr');
                
                // Time cell
                if (i === 0) {
                    const timeTd = document.createElement('td');
                    timeTd.className = 'time-col';
                    timeTd.rowSpan = maxEvents;
                    timeTd.textContent = t;
                    tr.appendChild(timeTd);
                }

                // Day cells
                daysOfWeek.forEach(day => {
                    const td = document.createElement('td');
                    if (i < rowEvents[day].length) {
                        const ev = rowEvents[day][i];
                        td.appendChild(createEventCard(ev));
                    }
                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            }
        });

        table.appendChild(tbody);
        scheduleContainer.appendChild(table);
    }

    function createEventCard(ev) {
        const div = document.createElement('div');
        
        // Determine type for color coding
        let typeClass = 'lecture';
        if (ev.activity_type.includes('ליגרת') || ev.activity_type.includes('תרגיל')) {
            typeClass = 'practice';
        } else if (ev.activity_type.includes('מעבדה')) {
            typeClass = 'lab';
        }

        div.className = `event-card ${typeClass}`;

        function fixText(str) {
            if (!str) return '---';
            let reversed = str.split('').reverse().join('');
            reversed = reversed.replace(/\(/g, 'TEMP_LPAREN')
                               .replace(/\)/g, '(')
                               .replace(/TEMP_LPAREN/g, ')');
            reversed = reversed.replace(/\[/g, 'TEMP_LBRACK')
                               .replace(/\]/g, '[')
                               .replace(/TEMP_LBRACK/g, ']');
            return reversed;
        }

        const courseName = fixText(ev.course_name || ev.course_id);
        const activityType = fixText(ev.activity_type);
        const timeRange = `<span dir="ltr">${ev.start_time}-${ev.end_time}</span>`;
        const instructor = fixText(ev.instructor);
        const room = fixText(ev.room);
        
        div.innerHTML = `
            <div class="event-course">${courseName}</div>
            <div class="event-type">${activityType}</div>
            <div class="event-detail">
                <span>🕒 ${timeRange}</span>
            </div>
            <div class="event-detail" style="margin-top: 4px;">
                <span>👨‍🏫 ${instructor}</span>
                <span>🚪 ${room}</span>
            </div>
        `;
        
        return div;
    }
});
