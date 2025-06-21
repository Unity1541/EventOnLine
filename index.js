
const DAYS_OF_WEEK = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const DEFAULT_TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00',
];

let AppTimeSlots = []; // Will be loaded from localStorage or defaults
let currentSelectedDate = new Date();

// --- Time Slot Management ---
const USER_TIME_SLOTS_KEY = 'userDefinedTimeSlots';

function loadEditableTimeSlots() {
  try {
    const storedSlots = localStorage.getItem(USER_TIME_SLOTS_KEY);
    if (storedSlots) {
      AppTimeSlots = JSON.parse(storedSlots);
      if (!Array.isArray(AppTimeSlots) || AppTimeSlots.some(s => typeof s !== 'string')) {
        // Basic validation, reset if data is corrupted
        console.warn('Stored time slots data is corrupted, resetting to defaults.');
        AppTimeSlots = [...DEFAULT_TIME_SLOTS];
        saveEditableTimeSlots();
      }
    } else {
      AppTimeSlots = [...DEFAULT_TIME_SLOTS];
    }
  } catch (error) {
    console.error("Error loading time slots from localStorage:", error);
    AppTimeSlots = [...DEFAULT_TIME_SLOTS];
  }
}

function saveEditableTimeSlots() {
  try {
    localStorage.setItem(USER_TIME_SLOTS_KEY, JSON.stringify(AppTimeSlots));
  } catch (error) {
    console.error("Error saving time slots to localStorage:", error);
  }
}

// --- Date Helper Functions ---
function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // day is 0 for Sunday
  return new Date(d.setDate(diff));
}

function formatDateForDisplay(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function formatDateForStorageAndInput(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// --- Data Management ---
function getNotesKey(dateForWeek) {
    const monday = getMonday(dateForWeek);
    return `weeklyNotepadData_${formatDateForStorageAndInput(monday)}`;
}

function loadNotes(dateForWeek) {
  const key = getNotesKey(dateForWeek);
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error loading notes from localStorage:", error);
    return {};
  }
}

function saveNotes(notes, dateForWeek) {
  const key = getNotesKey(dateForWeek);
  try {
    localStorage.setItem(key, JSON.stringify(notes));
  } catch (error) {
    console.error("Error saving notes to localStorage:", error);
  }
}

// --- UI Rendering & Status ---
let saveStatusTimeout;

function showSaveStatus(message, duration = 2000) {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.display = 'block';
        requestAnimationFrame(() => {
            statusEl.style.opacity = '1';
        });

        clearTimeout(saveStatusTimeout);
        saveStatusTimeout = setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => {
                if (statusEl.style.opacity === '0') {
                    statusEl.style.display = 'none';
                }
            }, 500);
        }, duration);
    }
}


function createNotepadElement(displayDate) {
    const container = document.createElement('div');
    container.id = 'notepad-container';
    container.setAttribute('role', 'grid');
    container.setAttribute('aria-labelledby', 'notepad-title');

    const currentMonday = getMonday(displayDate);
    const notesForGrid = loadNotes(currentMonday);

    const emptyHeaderCell = document.createElement('div');
    emptyHeaderCell.className = 'grid-cell header-cell';
    emptyHeaderCell.setAttribute('role', 'presentation');
    emptyHeaderCell.innerHTML = '&nbsp;';
    container.appendChild(emptyHeaderCell);

    DAYS_OF_WEEK.forEach((dayName, index) => {
        const actualDate = addDays(currentMonday, index);
        const dayCell = document.createElement('div');
        dayCell.className = 'grid-cell header-cell';
        dayCell.textContent = `${dayName} (${formatDateForDisplay(actualDate)})`;
        dayCell.setAttribute('role', 'columnheader');
        dayCell.setAttribute('scope', 'col');
        container.appendChild(dayCell);
    });

    AppTimeSlots.forEach((slotText, slotIndex) => {
        const timeSlotCell = document.createElement('div');
        timeSlotCell.className = 'grid-cell time-slot-label';
        timeSlotCell.setAttribute('role', 'rowheader');
        timeSlotCell.setAttribute('scope', 'row');

        const editableTextSpan = document.createElement('span');
        editableTextSpan.className = 'editable-slot-text';
        editableTextSpan.contentEditable = "true";
        editableTextSpan.textContent = slotText;
        editableTextSpan.dataset.slotIndex = slotIndex;
        editableTextSpan.dataset.originalText = slotText;
        editableTextSpan.setAttribute('aria-label', `編輯時段名稱： ${slotText}`);

        editableTextSpan.addEventListener('blur', (event) => {
            const newText = event.target.textContent.trim();
            const originalText = event.target.dataset.originalText;
            const index = parseInt(event.target.dataset.slotIndex, 10);

            if (newText && newText !== originalText) {
                handleTimeSlotTextChange(originalText, newText, index);
                showSaveStatus('時段已更新 ✓');
            } else if (!newText) { // Prevent empty slot text, revert
                event.target.textContent = originalText;
                 showSaveStatus('時段名稱不能為空 ×', 3000);
            } else {
                 event.target.textContent = originalText; // Ensure it's exactly the original if no change
            }
        });
        // Prevent newline in contenteditable span
        editableTextSpan.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.target.blur();
            }
        });


        const removeButton = document.createElement('button');
        removeButton.className = 'remove-slot-btn';
        removeButton.textContent = '×';
        removeButton.dataset.slotIndex = slotIndex;
        removeButton.setAttribute('aria-label', `移除時段 "${slotText}"`);
        removeButton.addEventListener('click', () => {
            handleRemoveTimeSlot(slotIndex);
        });

        timeSlotCell.appendChild(editableTextSpan);
        timeSlotCell.appendChild(removeButton);
        container.appendChild(timeSlotCell);

        DAYS_OF_WEEK.forEach((dayName, dayIndex) => {
            const actualDateForCell = addDays(currentMonday, dayIndex);
            const noteCellWrapper = document.createElement('div');
            noteCellWrapper.className = 'grid-cell';
            noteCellWrapper.setAttribute('role', 'gridcell');

            const textArea = document.createElement('textarea');
            textArea.className = 'note-area';
            textArea.dataset.day = dayName;
            textArea.dataset.slot = slotText; // Use the actual slot text as key

            const formattedDateForLabel = formatDateForDisplay(actualDateForCell);
            textArea.setAttribute('aria-label', `${dayName} ${formattedDateForLabel} ${slotText} 的筆記`);

            textArea.value = (notesForGrid[dayName] && notesForGrid[dayName][slotText]) ? notesForGrid[dayName][slotText] : '';

            textArea.addEventListener('input', () => {
                const currentNotes = loadNotes(currentMonday);
                if (!currentNotes[dayName]) {
                    currentNotes[dayName] = {};
                }
                currentNotes[dayName][slotText] = textArea.value;
                saveNotes(currentNotes, currentMonday);
                showSaveStatus('自動儲存 ✓');
            });

            noteCellWrapper.appendChild(textArea);
            container.appendChild(noteCellWrapper);
        });
    });

    return container;
}


// --- App Update and Rendering ---
function renderNotepadForDate(date) {
  const appRoot = document.getElementById('notepad-grid-container');
  const dailyNoteTextarea = document.getElementById('daily-note-textarea');
  const dailyNoteLabel = document.getElementById('daily-note-label');

  if (!appRoot || !dailyNoteTextarea || !dailyNoteLabel) {
    console.error('Required elements for rendering not found!');
    return;
  }

  appRoot.innerHTML = ''; // Clear previous grid

  const notepadGrid = createNotepadElement(date);
  appRoot.appendChild(notepadGrid);

  const mondayForWeek = getMonday(date);
  const notesForWeek = loadNotes(mondayForWeek);
  const dailyNoteKey = formatDateForStorageAndInput(date);

  const dailyNoteText = (notesForWeek._dailyNotes && notesForWeek._dailyNotes[dailyNoteKey])
                        ? notesForWeek._dailyNotes[dailyNoteKey]
                        : '';
  dailyNoteTextarea.value = dailyNoteText;

  const formattedDisplayDate = formatDateForDisplay(date);
  dailyNoteLabel.textContent = `本日記事 (${formattedDisplayDate})：`;
  dailyNoteTextarea.setAttribute('aria-label', `本日 (${formattedDisplayDate}) 記事`);
}

// --- Time Slot Action Handlers ---
function handleAddTimeSlot() {
    const newSlotText = prompt("請輸入新時段的名稱：", "New Slot");
    if (newSlotText && newSlotText.trim() !== "") {
        AppTimeSlots.push(newSlotText.trim());
        saveEditableTimeSlots();
        renderNotepadForDate(currentSelectedDate);
        showSaveStatus('新時段已新增 ✓');
    } else if (newSlotText !== null) { // User entered empty string and pressed OK
        alert("時段名稱不能為空。");
    }
}

function handleRemoveTimeSlot(slotIndexToRemove) {
    if (slotIndexToRemove < 0 || slotIndexToRemove >= AppTimeSlots.length) return;

    const slotTextToRemove = AppTimeSlots[slotIndexToRemove];
    if (confirm(`確定要移除時段 "${slotTextToRemove}" 嗎？\n此時段在本週的相關筆記將會被刪除。`)) {
        AppTimeSlots.splice(slotIndexToRemove, 1);
        saveEditableTimeSlots();

        // Migrate (delete) notes for this slot in the current week
        const currentMonday = getMonday(currentSelectedDate);
        const notesForCurrentWeek = loadNotes(currentMonday);
        let notesModified = false;
        DAYS_OF_WEEK.forEach(dayName => {
            if (notesForCurrentWeek[dayName] && notesForCurrentWeek[dayName][slotTextToRemove]) {
                delete notesForCurrentWeek[dayName][slotTextToRemove];
                if (Object.keys(notesForCurrentWeek[dayName]).length === 0) {
                    delete notesForCurrentWeek[dayName];
                }
                notesModified = true;
            }
        });
        if (notesModified) {
            saveNotes(notesForCurrentWeek, currentMonday);
        }

        renderNotepadForDate(currentSelectedDate);
        showSaveStatus('時段已移除 ✓');
    }
}

function handleTimeSlotTextChange(oldSlotText, newSlotText, slotIndex) {
    AppTimeSlots[slotIndex] = newSlotText;
    saveEditableTimeSlots();

    // Migrate notes from old slot text to new slot text for the current week
    const currentMonday = getMonday(currentSelectedDate);
    const notesForCurrentWeek = loadNotes(currentMonday);
    let notesModified = false;

    DAYS_OF_WEEK.forEach(dayName => {
        if (notesForCurrentWeek[dayName] && notesForCurrentWeek[dayName][oldSlotText]) {
            notesForCurrentWeek[dayName][newSlotText] = notesForCurrentWeek[dayName][oldSlotText];
            delete notesForCurrentWeek[dayName][oldSlotText];
            notesModified = true;
        }
    });

    if (notesModified) {
        saveNotes(notesForCurrentWeek, currentMonday);
    }
    // Re-render to update data-attributes and aria-labels on note areas and remove buttons
    renderNotepadForDate(currentSelectedDate);
}


// --- Initialization ---
function initApp() {
  loadEditableTimeSlots(); // Load custom or default time slots first

  const datePicker = document.getElementById('date-picker');
  const saveButton = document.getElementById('save-button');
  const dailyNoteTextarea = document.getElementById('daily-note-textarea');
  const addTimeSlotButton = document.getElementById('add-time-slot-button');

  if (!datePicker || !dailyNoteTextarea || !addTimeSlotButton) {
    console.error('Core elements not found!');
    return;
  }
   if (!saveButton) {
    console.error('Save button element (#save-button) not found, manual save disabled.');
  }

  datePicker.value = formatDateForStorageAndInput(currentSelectedDate);

  datePicker.addEventListener('input', (event) => {
    const newDateStr = event.target.value;
    if (newDateStr) {
        // Ensure time is set to midnight in local timezone to avoid off-by-one day issues
        const [year, month, day] = newDateStr.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);

        if (!isNaN(newDate.getTime())) {
            currentSelectedDate = newDate;
            renderNotepadForDate(currentSelectedDate);
        }
    }
  });

  dailyNoteTextarea.addEventListener('input', () => {
    const mondayOfSelectedDate = getMonday(currentSelectedDate);
    const notes = loadNotes(mondayOfSelectedDate);

    if (!notes._dailyNotes) {
        notes._dailyNotes = {};
    }
    const dailyNoteKey = formatDateForStorageAndInput(currentSelectedDate);
    notes._dailyNotes[dailyNoteKey] = dailyNoteTextarea.value;

    saveNotes(notes, mondayOfSelectedDate);
    showSaveStatus('自動儲存 ✓');
  });

  if (saveButton) {
    saveButton.addEventListener('click', () => {
        const currentDisplayedMonday = getMonday(currentSelectedDate);
        let notesObjectToSave = loadNotes(currentDisplayedMonday);

        // Ensure all currently displayed notes are captured
        document.querySelectorAll('#notepad-container .note-area').forEach(ta => {
            const day = ta.dataset.day;
            const slot = ta.dataset.slot; // This is the actual text of the slot
            if (day && slot) {
                if (!notesObjectToSave[day]) {
                    notesObjectToSave[day] = {};
                }
                notesObjectToSave[day][slot] = ta.value;
            }
        });

        if (!notesObjectToSave._dailyNotes) {
            notesObjectToSave._dailyNotes = {};
        }
        const dailyNoteKey = formatDateForStorageAndInput(currentSelectedDate);
        notesObjectToSave._dailyNotes[dailyNoteKey] = dailyNoteTextarea.value;

        saveNotes(notesObjectToSave, currentDisplayedMonday);
        showSaveStatus('筆記已儲存 ✓');
    });
  }

  addTimeSlotButton.addEventListener('click', handleAddTimeSlot);

  renderNotepadForDate(currentSelectedDate);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
