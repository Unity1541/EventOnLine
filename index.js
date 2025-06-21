
const DAYS_OF_WEEK = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00',
];
const CHARACTER_IMAGE_KEY = '_characterImage';

let currentSelectedDate = new Date(); 

// --- Date Helper Functions ---
function getMonday(d) {
  d = new Date(d); 
  const day = d.getDay(); 
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
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

// --- Character Image Functions ---
function saveCharacterImageForWeek(base64ImageString, dateForWeek) {
    const monday = getMonday(dateForWeek);
    const notes = loadNotes(monday);
    notes[CHARACTER_IMAGE_KEY] = base64ImageString;
    saveNotes(notes, monday);
}

function loadCharacterImageForWeek(dateForWeek) {
    const monday = getMonday(dateForWeek);
    const notes = loadNotes(monday);
    return notes[CHARACTER_IMAGE_KEY]; // Returns undefined if not set
}

function removeCharacterImageForWeek(dateForWeek) {
    const monday = getMonday(dateForWeek);
    const notes = loadNotes(monday);
    delete notes[CHARACTER_IMAGE_KEY];
    saveNotes(notes, monday);
}

function displayCharacterImage(base64ImageString) {
    const imgElement = document.getElementById('character-image-display');
    const removeButton = document.getElementById('remove-character-image-button');
    if (imgElement && removeButton) {
        if (base64ImageString) {
            imgElement.src = base64ImageString;
            imgElement.style.display = 'block';
            removeButton.style.display = 'inline-block';
        } else {
            imgElement.src = '';
            imgElement.style.display = 'none';
            removeButton.style.display = 'none';
        }
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

    TIME_SLOTS.forEach(slot => {
        const timeSlotCell = document.createElement('div');
        timeSlotCell.className = 'grid-cell time-slot-label';
        timeSlotCell.textContent = slot;
        timeSlotCell.setAttribute('role', 'rowheader');
        timeSlotCell.setAttribute('scope', 'row');
        container.appendChild(timeSlotCell);

        DAYS_OF_WEEK.forEach((dayName, dayIndex) => {
            const actualDateForCell = addDays(currentMonday, dayIndex);
            const noteCellWrapper = document.createElement('div');
            noteCellWrapper.className = 'grid-cell';
            noteCellWrapper.setAttribute('role', 'gridcell');

            const textArea = document.createElement('textarea');
            textArea.className = 'note-area';
            textArea.dataset.day = dayName;
            textArea.dataset.slot = slot;
            
            const formattedDateForLabel = formatDateForDisplay(actualDateForCell);
            textArea.setAttribute('aria-label', `${dayName} ${formattedDateForLabel} ${slot} 的筆記`);
            
            textArea.value = (notesForGrid[dayName] && notesForGrid[dayName][slot]) ? notesForGrid[dayName][slot] : '';

            textArea.addEventListener('input', () => {
                const currentNotes = loadNotes(currentMonday);
                if (!currentNotes[dayName]) {
                    currentNotes[dayName] = {};
                }
                currentNotes[dayName][slot] = textArea.value;
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
  
  appRoot.innerHTML = ''; 
  
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

  // Load and display character image
  const characterImageDataBase64 = loadCharacterImageForWeek(date);
  displayCharacterImage(characterImageDataBase64);
}

// --- Initialization ---
function initApp() {
  const datePicker = document.getElementById('date-picker');
  const saveButton = document.getElementById('save-button');
  const dailyNoteTextarea = document.getElementById('daily-note-textarea');
  const characterImageUpload = document.getElementById('character-image-upload');
  const removeCharacterImageButton = document.getElementById('remove-character-image-button');
  
  if (!datePicker || !dailyNoteTextarea || !characterImageUpload || !removeCharacterImageButton) {
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
        const newDate = new Date(newDateStr + 'T00:00:00'); 
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

        document.querySelectorAll('#notepad-container .note-area').forEach(ta => {
            const day = ta.dataset.day;
            const slot = ta.dataset.slot;
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
        // Character image is saved/removed on its own events, no need to handle here explicitly
        // unless we want save button to also persist it from a different source.

        saveNotes(notesObjectToSave, currentDisplayedMonday);
        // No need to re-render, just show status, as data is already in localStorage.
        // renderNotepadForDate(currentSelectedDate); // This would reload from storage, fine but redundant.
        showSaveStatus('筆記已儲存 ✓');
    });
  }

  characterImageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;
            saveCharacterImageForWeek(base64Image, currentSelectedDate);
            displayCharacterImage(base64Image);
            showSaveStatus('圖片已儲存 ✓');
        };
        reader.readAsDataURL(file);
    }
    // Clear the input value so the same file can be selected again if removed and re-added
    event.target.value = null; 
  });

  removeCharacterImageButton.addEventListener('click', () => {
    removeCharacterImageForWeek(currentSelectedDate);
    displayCharacterImage(null); // Clears the display and hides button
    showSaveStatus('圖片已移除 ✓');
  });
  
  renderNotepadForDate(currentSelectedDate);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
