const CYCLE_LENGTH = 10;
let isTyping = false;


//Style Set management
const DEFAULT_FONT = 'monospace';
const DEFAULT_FONT_VARS = {
  'search-text-color': '#ffffff',
  'search-text-outline': 'none',
  'clock-text-color': '#ffffff',
  'clock-text-outline': 'none',
  'date-text-color': '#ffffff',
  'date-text-outline': 'none'
};

function getCurrentStyle() {
  return {
    userFont: localStorage.getItem('userFont') || DEFAULT_FONT,
    fontVars: JSON.parse(localStorage.getItem('fontVars') || '{}'),
    bgSettings: JSON.parse(localStorage.getItem('bgSettings') || '{}'),
    clockMode: localStorage.getItem('clockMode') || '12',
    cellColour: localStorage.getItem('cellColour') || '#ffffff',
    cellColours: JSON.parse(localStorage.getItem('cellColours') || '{}')
  };
}

function applyStyle(styleObj) {
  // Font
  document.documentElement.style.setProperty('--font', styleObj.userFont || DEFAULT_FONT);

  // Colors & outlines
  const fontVars = { ...DEFAULT_FONT_VARS, ...(styleObj.fontVars || {}) };
  Object.keys(fontVars).forEach(varName => {
    document.documentElement.style.setProperty(`--${varName}`, fontVars[varName]);
  });

  // Background
  // If styleObj.bgSettings is an empty object, treat as unset and use defaults
  bgSettings = (styleObj.bgSettings && Object.keys(styleObj.bgSettings).length) ? styleObj.bgSettings : { ...DEFAULT_BG_SETTINGS };
  applyBackground();

  // Clock
  localStorage.setItem('clockMode', styleObj.clockMode || '12');
  updateClock();

  // Cell colour
  const cellColour = styleObj.cellColour || '#ffffff';
  document.documentElement.style.setProperty('--cell-colour', cellColour);
  localStorage.setItem('cellColour', cellColour);
  // Per-subject colours
  const cellColoursToStore = styleObj.cellColours || {};
  localStorage.setItem('cellColours', JSON.stringify(cellColoursToStore));
  // Update in-memory mapping and update existing cells
  try { cellColours = JSON.parse(localStorage.getItem('cellColours') || '{}'); } catch (e) { cellColours = {}; }
  document.querySelectorAll('.cell.icon').forEach(el => {
    const iconUrl = el.style.getPropertyValue('--cell-icon') || '';
    const match = iconUrl.match(/([^/\\]+)\.png\)/);
    if (match) {
      const filename = match[1];
      const subj = Object.keys(iconMap).find(k => iconMap[k] && iconMap[k].includes(filename));
      const c = (subj && cellColours[subj]) || localStorage.getItem('cellColour') || '#ffffff';
      el.style.setProperty('--cell-colour', c);
    }
  });
}

// First known school day
// IMPORTANT: this must be a weekday
const cycleStartDate = new Date(2026, 0, 27); // example: Feb 3, 2025 (Mon)

const DEFAULT_BG_SETTINGS = {
  mode: "fluid",
  color: "",
  image: "bg.png",
  parallax: false
};

let bgSettings = JSON.parse(localStorage.getItem("bgSettings"));

if (!bgSettings) {
  bgSettings = { ...DEFAULT_BG_SETTINGS };
  localStorage.setItem("bgSettings", JSON.stringify(bgSettings));
}

/* ---------------- DISABLE BROWSER SHORTCUTS & ZOOM ---------- */
document.onkeydown = function(e) {
  if (e.ctrlKey) {
    // Block view source + save only
    if (e.key === 'u' || e.key === 's') {
      e.preventDefault();
      return false;
    }
  }
};
    
    // Prevent Ctrl+Scroll zoom
    document.addEventListener('wheel', function(e) {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false });

    // Get Period and Date
    function getCurrentPeriod() {
      const now = new Date();
      const time = now.getHours() * 60 + now.getMinutes();
      return periodTimes.findIndex(p => {
        const [sh, sm] = p.start.split(':').map(Number);
        const [eh, em] = p.end.split(':').map(Number);
        return time >= sh * 60 + sm && time <= eh * 60 + em;
      });
    }

    function countWeekdays(start, end) {
      let count = 0;
      const cur = new Date(start);

      while (cur < end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }

    function getCycleDayForDate(date) {
      const weekdaysPassed = countWeekdays(cycleStartDate, date);
      return (weekdaysPassed % CYCLE_LENGTH) + 1;
    }

    function getCycleDay() {
      const today = new Date();
    
      // If weekend, show last Friday's cycle day
      if (today.getDay() === 0 || today.getDay() === 6) {
        const friday = new Date(today);
        friday.setDate(today.getDate() - (today.getDay() === 6 ? 1 : 2));
        return getCycleDayForDate(friday);
      }
    
      return getCycleDayForDate(today);
    }

    function isWeekend() {
      const day = new Date().getDay();
      return day === 0 || day === 6; // Sunday (0), Saturday (6)
    }


    let currentDay = getCycleDay();

    /* ---------------- BACKGROUND SETTINGS ---------------- */
    try {
      const stored = localStorage.getItem('bgSettings');
      if (stored) bgSettings = JSON.parse(stored);
    } catch {}

        // Restore saved font
    const savedFont = localStorage.getItem('userFont');
    if (savedFont) {
      document.documentElement.style.setProperty('--font', savedFont);
    }

    /* ---------------- CLOCK & DATE & DYNAMIC BACKGROUND ---------------- */
    function updateClock() {

      const now = new Date();
      const clockFormat = localStorage.getItem('clockMode') || '12';
      document.getElementById('clock').textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: clockFormat === '12'
      });
      const dateEl = document.getElementById('date');

      if (isWeekend()) {
        dateEl.textContent =
          now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) +
          " - Weekend";
      } else {
        dateEl.textContent =
          now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) +
          " - Day " + currentDay.toString();
      }
      
      // Color stops throughout the day
      if (bgSettings.mode !== 'fluid') return;
      const colorStops = [
        { hour: 0, color: { r: 47, g: 36, b: 75 } },       // 12AM: #2f244b
        { hour: 6, color: { r: 255, g: 119, b: 119 } },     // 6AM: #ff7777
        { hour: 9, color: { r: 255, g: 253, b: 112 } },     // 9AM: #fffd70
        { hour: 15, color: { r: 120, g: 246, b: 255 } },    // 3PM: #78f6ff
        { hour: 17, color: { r: 159, g: 149, b: 255 } },    // 5PM: #9f95ff
        { hour: 19, color: { r: 246, g: 149, b: 255 } },    // 7PM: #f695ff
        { hour: 22, color: { r: 98, g: 68, b: 176 } },      // 10PM: #6244b0
        { hour: 24, color: { r: 47, g: 36, b: 75 } },       // 12AM: #2f244b

      ];
      
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeInHours = hours + minutes / 60;
      
      // Find the two color stops to interpolate between
      let stop1 = colorStops[0];
      let stop2 = colorStops[1];
      
      for (let i = 0; i < colorStops.length - 1; i++) {
        if (timeInHours >= colorStops[i].hour && timeInHours < colorStops[i + 1].hour) {
          stop1 = colorStops[i];
          stop2 = colorStops[i + 1];
          break;
        }
      }
      
      // Calculate ratio between the two stops
      const ratio = (timeInHours - stop1.hour) / (stop2.hour - stop1.hour);
      
      // Interpolate RGB values
      const r = Math.round(stop1.color.r + (stop2.color.r - stop1.color.r) * ratio);
      const g = Math.round(stop1.color.g + (stop2.color.g - stop1.color.g) * ratio);
      const b = Math.round(stop1.color.b + (stop2.color.b - stop1.color.b) * ratio);
      
      if (bgSettings.mode === 'fluid') {
        document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      }
    }
    function applyBackground() {
      const body = document.body;
    
      // Reset
      body.style.backgroundImage = '';
      body.style.backgroundColor = '';
      body.style.backgroundRepeat = 'no-repeat';
      if (bgSettings.parallax) {
        body.style.backgroundSize = '110%';
        body.style.backgroundPosition = 'center';
      } else {
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
      }
      body.style.backgroundBlendMode = 'normal';
      

      // Image layer (used in ALL modes if present)
      if (bgSettings.image) {
        body.style.backgroundImage = `url('user_assets/${bgSettings.image}')`;
      }
    
      // Colour overlay
      if (bgSettings.mode === 'color' && bgSettings.color) {
        body.style.backgroundColor = bgSettings.color;
        body.style.backgroundImage = 'assets/bg.png';
        body.style.backgroundBlendMode = 'overlay';
      }
    
      // Fluid overlay (handled by updateClock)
      if (bgSettings.mode === 'fluid') {
        body.style.backgroundImage = `url('assets/bg.png')`;
        body.style.backgroundBlendMode = 'overlay';
      }
    }
    applyBackground();   // instant paint
    updateClock();       // sets fluid colour immediately
    setInterval(updateClock, 1000);
    /* ---------------- TIMETABLE DATA ---------------- */
    // 2‑week cycle, 10 days, ignore HG / recess / lunch
    // Replace / refine as needed

      // Each day MUST have 7 slots: P0–P6
      // Use 'none' if no Period 0
      // If a subject is a double, second slot becomes 'double'

      // ⚠️ NOTE: Subjects below are still PLACEHOLDERS until we transcribe
      // the white timetable exactly.

    const timetable = [
      // Day 1
      ['none', 4, 3, 2, 1, 5, 6],
    
      // Day 2
      ['none', 4, 'double', 1, 'bib', 5, 3],
    
      // Day 3
      [4, 2, 'double', 3, 'double', 'free', 'free'],
    
      // Day 4
      ['none', 5, 'double', 3, 'chp', 6, 'double'],
    
      // Day 5
      ['none', 1, 'double', 4, 2, 6, 5],
    
      // Day 6
      ['none', 2, 3, 5, 6, 4, 1],
    
      // Day 7
      ['none', 4, 'double', 1, 'bib', 3, 2],
    
      // Day 8
      [6, 5, 'double', 1, 'double', 'free', 'free'],
    
      // Day 9
      ['none', 6, 'double', 2, 'chp', 3, 'double'],
    
      // Day 10
      ['none', 6, 5, 2, 'double', 1, 4],
    ];


    const iconMap = {
      none: null,
      double: 'assets/double.png',
      eng: 'assets/eng.png',
      met: 'assets/met.png',
      spc: 'assets/spc.png',
      chm: 'assets/chm.png',
      bio: 'assets/bio.png',
      acc: 'assets/acc.png',
      rev: 'assets/rev.png',
      phy: 'assets/phy.png',
      bib: 'assets/bib.png',
      chp: 'assets/chp.png',
      free: 'assets/free.png',
      _ph1: 'assets/ph1.png',
      _ph2: 'assets/ph2.png',
      _ph3: 'assets/ph3.png',
      _ph4: 'assets/ph4.png',
      _ph5: 'assets/ph5.png',
      _ph6: 'assets/ph6.png',
      vet: 'assets/vet.png',
      cns: 'assets/cns.png'
    };

    // Block → subject mapping (THIS is what /setblock will modify)
  let blockSubjects = {
    1: '_ph1',
    2: '_ph2',
    3: '_ph3',
    4: '_ph4',
    5: '_ph5',
    6: '_ph6'
  };

  try {
    const stored = localStorage.getItem('blockSubjects');
    if (stored) blockSubjects = JSON.parse(stored);
  } catch {}

// Per-subject cell colours (subject -> hex)
let cellColours = {};
try {
  const stored = localStorage.getItem('cellColours');
  if (stored) cellColours = JSON.parse(stored);
} catch {}

  let inserts = {
    p0: {},       // day -> subject
    free: {}      // "day-period" -> true
  };
  try {
    const stored = localStorage.getItem('inserts');
    if (stored) inserts = JSON.parse(stored);
  } catch {}

  function resolveTimetable(raw) {
    return raw.map((day, dayIndex) =>
      day.map((period, periodIndex) => {

        // 1. P0 insert
        if (periodIndex === 0 && inserts.p0[dayIndex + 1]) {
          return inserts.p0[dayIndex + 1];
        }

        // 2. Free insert
        const freeKey = `${dayIndex + 1}-${periodIndex}`;
        if (inserts.free[freeKey]) {
          return 'free';
        }

        // 3. Block resolution
        if (typeof period === 'number') {
          return blockSubjects[period];
        }

        // 4. Pass-through (double, none, bib, etc)
        return period;
      })
    );
  }
    /* ---------------- RENDER ---------------- */
    const grid = document.getElementById('timetable');

    const resolvedTimetable = resolveTimetable(timetable);

    resolvedTimetable.forEach((day, dayIndex) => {
      while (day.length < 7) day.unshift('none');
    
      day.forEach((period, periodIndex) => {
        const el = document.createElement('div');
        el.dataset.day = dayIndex;
      
        if (period !== 'none') {
          let subject = period;
        
          // Resolve block numbers
          if (typeof period === 'number') {
            subject = blockSubjects[period];
          }
        
          el.classList.add('cell');
        
          if (iconMap[subject]) {
            el.classList.add('icon');
            el.style.setProperty(
              '--cell-icon',
              `url(${iconMap[subject]})`
            );
            // apply per-subject colour if present, else fallback to global
            const subjectColour = cellColours[subject] || localStorage.getItem('cellColour') || '#ffffff';
            el.style.setProperty('--cell-colour', subjectColour);
          } else {
            el.classList.add('none');
          }
        } else {
          el.classList.add('none');
        }
      
        if (!isWeekend()) {
          if (dayIndex === currentDay - 1) {
            el.classList.add('current-day');
          } else {
            el.classList.add('other-day');
          }
        }
      
        grid.appendChild(el);
      });
    })


    /* ---------------- ACTIVE PERIOD TRACKING ---------------- */
    // Rough period times – adjust to match your school
    const periodTimes = [
      // P0 (if applicable)
      { start: '08:05', end: '08:55' },
      // P1–P6
      { start: '09:15', end: '10:05' },
      { start: '10:05', end: '10:55' },
      { start: '11:25', end: '12:15' },
      { start: '12:15', end: '13:05' },
      { start: '13:55', end: '14:45' },
      { start: '14:45', end: '15:35' },
    ];

  
    /* ---------------- SEARCH / COMMAND BAR ---------------- */
    const searchText = document.getElementById('search-text');
      
    // Load saved name from localStorage
    let name = null;
    try {
      const stored = localStorage.getItem('userData');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.name && data.name.trim()) {
          name = data.name;
        }
      }
    } catch (e) {
      console.error('Failed to load name from storage', e);
    } 
    try {
      const storedBlocks = localStorage.getItem('blockSubjects');
      if (storedBlocks) {
        blockSubjects = JSON.parse(storedBlocks);
      }
    } catch (e) {
      console.error('Failed to load blockSubjects', e);
    }
    


    let commandMode = false;
    
    // Save name to localStorage
    function saveName() {
      const data = { name };
      localStorage.setItem('userData', JSON.stringify(data));
    }
    
    function allBlocksSet() {
      return Object.values(blockSubjects).every(s => !s.startsWith('_ph'));
    }

    function hasAnyP0() {
      return timetable.some(day => day[0] !== 'none');
    }

    function todayKey() {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    function hasSeenHelpTip() {
      return localStorage.getItem('helpTipShownDate') === todayKey();
    }

    function markHelpTipSeen() {
      localStorage.setItem('helpTipShownDate', todayKey());
    }

    let greetingTimer = null;

    function typeGreeting(text, speed = 35) {
      clearInterval(greetingTimer);
      searchText.value = '';
    
      let i = 0;
      greetingTimer = setInterval(() => {
        if (i >= text.length) {
          clearInterval(greetingTimer);
          greetingTimer = null;
          return;
        }
        searchText.value += text[i++];
      }, speed);
    }

    function enterTypingMode() {
      clearInterval(greetingTimer);
      greetingTimer = null;
    
      if (isTyping) return;
    
      isTyping = true;
      commandMode = false;
    
      searchText.readOnly = false;
      searchText.classList.remove('command');
      searchText.value = '';
      searchText.focus();
    }

    function exitTypingMode() {
      if (!isTyping) return;
    
      isTyping = false;
      commandMode = false;
    
      searchText.readOnly = true;
      searchText.classList.remove('command');
      searchText.blur();
    
      const greeting = getGreeting();
      typeGreeting(greeting);
    }

    // Greeting helper
    function getGreeting() {
      // 1. No name
      if (!name) {
        return "Tip: Start typing '/setname [name]' to register your name!";
      }

      // 2. Blocks not fully set
      if (!allBlocksSet()) {
        return "Tip: Use '/setblock [block] [subject]' to set your subjects! Try '/help' for more.";
      }

      // 3. Show help tip once per day AFTER blocks are set
      if (!hasSeenHelpTip()) {
        markHelpTipSeen();
        return "Tip: Try '/help'! For setting up extra p0s and frees.";
      }

      // 4. After help tip → good-to-go (once per day OR until search)
      const goodToGoSeen = localStorage.getItem('goodToGoSeenDate');
      if (goodToGoSeen !== todayKey()) {
        return "Just start typing to browse the web!";
      }
      // 5. Default time-based greetings
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      if (isWeekend()) {
        return `Enjoy the weekend, ${name}!`;
      }
      if (hours >= 0 && hours < 2) return `On the late night grind, ${name}?`;
      if (hours >= 2 && hours < 6) return `${name}! GO! TO! BED!`;
      if (hours >= 6 && hours < 8) return `Up and early, ${name}!`;
      // Morning / school day
      if (hours >= 8 && (hours < 9 || (hours === 9 && minutes < 15))) return `Good morning, ${name}!`;

      // Waiting for lunch (specific)
      if (timeInMinutes >= 685 && timeInMinutes < 745) return `Waiting for lunch, aren'tcha, ${name}?`;

      // General school daytime (broader)
      if (timeInMinutes >= 555 && timeInMinutes < 745) return `Great day ahead, ${name}!`;

      // Lunch
      if (timeInMinutes >= 795 && timeInMinutes < 835) return `Whadya have for lunch, ${name}?`;
      if (timeInMinutes >= 835 && timeInMinutes < 885) return `Hope you're ready for more, ${name}!!`;
      if (timeInMinutes >= 885 && timeInMinutes < 935) return `Final stretch! Go, go, go!`;
      if (timeInMinutes >= 935 && timeInMinutes < 1000) return `YOU MADE IT!! WOOOH!!!!`;
      if (hours >= 16 && hours < 19) return `Howdy, ${name}!`;
      if (hours >= 22 || hours < 0) return `Late night study vibes, ${name}?`;
      if (hours >= 19 && hours < 22) return `Good evening, ${name}!`;
      return `Hello, ${name}!`;
    }
    
    // Animate gradient
    let gradientPosition = 0;
    function animateGradient() {
      if (commandMode) {
        gradientPosition = (gradientPosition + 1) % 400;
        searchText.style.backgroundPosition = `${gradientPosition}% 0%`;
      }
      requestAnimationFrame(animateGradient);
    }
    animateGradient();
    
    // Initialize greeting
    window.addEventListener('DOMContentLoaded', () => {
      // Start in greeting mode
      isTyping = false;
      commandMode = false;
    
      searchText.readOnly = true;
      searchText.classList.remove('command');
    
      // Type greeting on first load
      typeGreeting(getGreeting());
    });
    searchText.readOnly = true;
    
    // Typing listener
// Focus input on any key press
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key.length === 1 && !isTyping) {
    enterTypingMode();

    searchText.value = e.key;
    searchText.dispatchEvent(new Event('input'));

    e.preventDefault();
  }
});
searchText.addEventListener('input', () => {
  if (!isTyping) return;

  const value = searchText.value;

  // Exit typing mode when emptied
  if (value.length === 0) {
    requestAnimationFrame(() => {
      if (isTyping && searchText.value.length === 0) {
        exitTypingMode();
      }
    });
    return;
  }

  // Command detection
  if (value.startsWith('/')) {
    if (!commandMode) {
      commandMode = true;
      searchText.classList.add('command');
    }
  } else {
    if (commandMode) {
      commandMode = false;
      searchText.classList.remove('command');
    }
  }
});

searchText.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;

  e.preventDefault();

  const value = searchText.value.trim();
  if (!value) return;

  // COMMAND MODE
  if (value.startsWith('/')) {
    const parts = value.split(' ');

          if (parts[0] === '/setname' && parts[1]) {
            name = parts.slice(1).join(' ');
            saveName(); // save permanently
          } 
          else if (parts[0] === '/setblock' && parts.length >= 3) {
            const block = Number(parts[1]);
            const subject = parts[2].toLowerCase();

            if (block >= 1 && block <= 6 && iconMap[subject]) {
              blockSubjects[block] = subject;
              localStorage.setItem('blockSubjects', JSON.stringify(blockSubjects));
              location.reload();
            }
          }
          else if (parts[0] === '/reset') {
              const confirmed = confirm("This will reset ALL local data. Are you sure?");
              if (!confirmed) return;
          
              // Remove all stored data
              localStorage.removeItem('userData');
              localStorage.removeItem('blockSubjects');
              localStorage.removeItem('inserts');
              localStorage.removeItem('helpTipShownDate');
              localStorage.removeItem('helpTipSeenDate');
              localStorage.removeItem('goodToGoSeenDate');
          
              // Style-related
              localStorage.removeItem('bgSettings');
              localStorage.removeItem('userFont');
              localStorage.removeItem('fontVars');    // text colors & outlines
              localStorage.removeItem('clockMode');
              localStorage.removeItem('cellColour');
              localStorage.removeItem('cellColours');
              localStorage.removeItem('savedStyles'); // saved style sets
          
              location.reload();
          }
          else if (parts[0] === '/help') {
            localStorage.setItem('helpTipSeenDate', todayKey());
            localStorage.setItem('helpTipShownDate', todayKey());
            window.location.href = 'help.html';

          }
          else if (parts[0] === '/insert' && parts[1] === 'p0' && parts.length >= 4) {
            const subject = parts[2].toLowerCase();
            const day = Number(parts[3]);
                    
            if (day >= 1 && day <= 10 && iconMap[subject]) {
              inserts.p0[day] = subject;
              localStorage.setItem('inserts', JSON.stringify(inserts));
              location.reload();
            }
          }
          else if (parts[0] === '/insert' && parts[1] === 'free' && parts.length >= 4) {
            const day = Number(parts[2]);
            const period = Number(parts[3]);
                    
            if (
              day >= 1 && day <= 10 &&
              period >= 0 && period <= 6
            ) {
              const key = `${day}-${period}`;
              inserts.free[key] = true;
              localStorage.setItem('inserts', JSON.stringify(inserts));
              location.reload();
            }
          }
          else if (parts[0] === '/remove' && parts[1] === 'all') {
            inserts.p0 = {};
            inserts.free = {};

            localStorage.setItem('inserts', JSON.stringify(inserts));
            location.reload();
          }
          else if (parts[0] === '/remove' && parts.length >= 3) {
            const day = Number(parts[1]);
            const period = Number(parts[2]);

            let changed = false;

            // Remove P0 insert
            if (period === 0 && inserts.p0[day]) {
              delete inserts.p0[day];
              changed = true;
            }
          
            // Remove free insert
            const freeKey = `${day}-${period}`;
            if (inserts.free[freeKey]) {
              delete inserts.free[freeKey];
              changed = true;
            }
          
            if (changed) {
              localStorage.setItem('inserts', JSON.stringify(inserts));
              location.reload();
            }
          }
          else if (parts[0] === '/setbg') {

            // /setbg fluid
            if (parts[1] === 'fluid') {
              bgSettings = { mode: 'fluid', color: null, image: null };
            }
          
            // /setbg colour #rrggbb
            else if (parts[1] === 'colour' && parts[2]) {
              const hex = parts[2].toLowerCase();
              if (/^#([0-9a-f]{6})$/.test(hex)) {
                bgSettings = { mode: 'color', color: hex, image: null };
              }
            }
          
            // /setbg img filename.png
            else if (parts[1] === 'img' && parts[2]) {
              bgSettings = { mode: 'image', color: null, image: parts[2] };
            }

            // Optional parallax toggle: /setbg parallax on|off add later
            else if (parts[1] === 'parallax' && parts[2]) {
              const value = parts[2].toLowerCase();

              if (value === 'true') {
                bgSettings.parallax = true;
              } 
              else if (value === 'false') {
                bgSettings.parallax = false;
              
                // Reset position immediately
                document.body.style.backgroundPosition = 'center';
              } 
              else {
                return;
              }
            
              localStorage.setItem('bgSettings', JSON.stringify(bgSettings));
              applyBackground();
            }
          
            localStorage.setItem('bgSettings', JSON.stringify(bgSettings));
            applyBackground();
          }
          else if (parts[0] === '/setfont') {
              const subcommand = parts[1]; // 'family', 'colour', 'outline'
          
              if (subcommand === 'family' && parts.length >= 3) {
                  // Set font family
                  let chosenFont = parts.slice(2).join(' ').trim();
                  if (chosenFont.toLowerCase() === 'default') chosenFont = 'monospace';
                  if (chosenFont.includes(' ')) chosenFont = `"${chosenFont}"`;
                  document.documentElement.style.setProperty('--font', chosenFont);
                  localStorage.setItem('userFont', chosenFont);
              } 
              else if ((subcommand === 'colour' || subcommand === 'outline') && parts.length >= 4) {
                  const target = parts[2].toLowerCase(); // 'search', 'clock', 'date', or 'all'
                  let value = parts.slice(3).join(' ').trim(); // color value or 'default'
              
                  const defaults = {
                      'search-text-color': '#ffffff',
                      'search-text-outline': 'none',
                      'clock-text-color': '#ffffff',
                      'clock-text-outline': 'none',
                      'date-text-color': '#ffffff',
                      'date-text-outline': 'none'
                  };
                
                  // Determine which CSS variables to set
                  let variables = [];
                  if (target === 'all') {
                      if (subcommand === 'colour') variables = ['search-text-color','clock-text-color','date-text-color'];
                      else variables = ['search-text-outline','clock-text-outline','date-text-outline'];
                  } else {
                      if (subcommand === 'colour') variables = [`${target}-text-color`];
                      else variables = [`${target}-text-outline`];
                  }
                
                  // Load stored variables from localStorage
                  let fontVars = JSON.parse(localStorage.getItem('fontVars') || '{}');
                
                  // Apply and store each variable
                  variables.forEach(v => {
                      const finalValue = value.toLowerCase() === 'default' ? defaults[v] : value;
                      document.documentElement.style.setProperty(`--${v}`, finalValue);
                      fontVars[v] = finalValue;
                  });
                
                  localStorage.setItem('fontVars', JSON.stringify(fontVars));
              }
          }
          else if (parts[0] === '/setclock' && parts.length >= 2) {
            const mode = parts[1].trim();
            if (mode === '12' || mode === '24') {
              localStorage.setItem('clockMode', mode);
              updateClock(); // immediately update the display
            } else {
              alert('Invalid clock format. Use /setclock 12 or /setclock 24.');
            }
          }
          else if (parts[0] === '/style') {
            const sub = parts[1]; // reset, save, load

            if (sub === 'reset') {
              // Reset ALL style things
              localStorage.removeItem('userFont');
              localStorage.removeItem('fontVars');
              localStorage.removeItem('bgSettings');
              localStorage.removeItem('clockMode');
              localStorage.removeItem('cellColour');
              localStorage.removeItem('cellColours');
            
              applyStyle(getCurrentStyle());
            }
          
            else if (sub === 'save' && parts.length >= 3) {
              const name = parts.slice(2).join(' ').trim();
              if (!name) return;
            
              let savedStyles = JSON.parse(localStorage.getItem('savedStyles') || '{}');
              savedStyles[name] = getCurrentStyle();
              localStorage.setItem('savedStyles', JSON.stringify(savedStyles));
            
              alert(`Style saved as "${name}".`);
            }
          
            else if (sub === 'load' && parts.length >= 3) {
              const name = parts.slice(2).join(' ').trim();
              let savedStyles = JSON.parse(localStorage.getItem('savedStyles') || '{}');
            
              if (!savedStyles[name]) {
                return;
              }
            
              const styleToLoad = savedStyles[name];
            
              // Apply and store each part
              localStorage.setItem('userFont', styleToLoad.userFont || DEFAULT_FONT);
              localStorage.setItem('fontVars', JSON.stringify(styleToLoad.fontVars || {}));
              localStorage.setItem('bgSettings', JSON.stringify(styleToLoad.bgSettings || DEFAULT_BG_SETTINGS));
              localStorage.setItem('clockMode', styleToLoad.clockMode || '12');
              localStorage.setItem('cellColour', styleToLoad.cellColour || '#ffffff');
              localStorage.setItem('cellColours', JSON.stringify(styleToLoad.cellColours || {}));
            
              applyStyle(styleToLoad);
              // Update in-page cells to new colours immediately
              try { cellColours = JSON.parse(localStorage.getItem('cellColours') || '{}'); } catch (e) { cellColours = {}; }
              document.querySelectorAll('.cell.icon').forEach(el => {
                const iconUrl = el.style.getPropertyValue('--cell-icon') || '';
                const match = iconUrl.match(/([^/\\]+)\.png\)/);
                if (match) {
                  const filename = match[1];
                  const subj = Object.keys(iconMap).find(k => iconMap[k] && iconMap[k].includes(filename));
                  const c = (subj && cellColours[subj]) || localStorage.getItem('cellColour') || '#ffffff';
                  el.style.setProperty('--cell-colour', c);
                }
              });
            }

            else if (sub === 'remove' && parts.length >= 3) {
              const name = parts.slice(2).join(' ').trim();
              let savedStyles = JSON.parse(localStorage.getItem('savedStyles') || '{}');
            
              if (savedStyles[name]) {
                delete savedStyles[name];
                localStorage.setItem('savedStyles', JSON.stringify(savedStyles));
                alert(`Style "${name}" removed.`);
              } else {
                alert(`Style "${name}" does not exist.`);
              }
            }
          }
          // Hypershortcuts
          else if (value.startsWith('//')) {
              const parts = value.slice(2).trim().split(' '); // remove '//' and split
              const shortcutName = parts[0];
              const link = parts.slice(1).join(' ');
          
              if (!shortcutName) return;
          
              // Load existing shortcuts
              const shortcuts = JSON.parse(localStorage.getItem('hypershortcuts') || '{}');
          
              if (!link) {
                  // Open the shortcut
                  if (shortcuts[shortcutName]) {
                    window.location.href = shortcuts[shortcutName];
                  } else {
                      return;
                  }
              } else if (link.toLowerCase() === 'remove') {
                  // Remove shortcut
                  delete shortcuts[shortcutName];
                  localStorage.setItem('hypershortcuts', JSON.stringify(shortcuts));
                  alert(`Shortcut '${shortcutName}' removed.`);
              } else {
                  // Add/update shortcut
                  shortcuts[shortcutName] = link;
                  localStorage.setItem('hypershortcuts', JSON.stringify(shortcuts));
                  alert(`Shortcut '${shortcutName}' saved → ${link}`);
              }
          }
          else if (parts[0] === '/setcell' && parts[1] === 'colour' && parts.length >= 4) {
            // /setcell colour [subject|all] [#rrggbb]
            const subject = parts[2].toLowerCase();
            const hex = parts[3].toLowerCase();

            if (!/^#([0-9a-f]{6})$/.test(hex)) return;

            // Load existing mapping
            try { cellColours = JSON.parse(localStorage.getItem('cellColours') || '{}'); } catch (e) { cellColours = {}; }

            if (subject === 'all') {
              // apply to all known subjects (skip 'none')
              Object.keys(iconMap).forEach(k => {
                if (k !== 'none') cellColours[k] = hex;
              });
              // also set global fallback
              document.documentElement.style.setProperty('--cell-colour', hex);
              localStorage.setItem('cellColour', hex);
            } else {
              // validate subject exists in map
              if (!iconMap.hasOwnProperty(subject)) return;
              cellColours[subject] = hex;
              // if subject is special (e.g. set global), leave global alone
            }

            localStorage.setItem('cellColours', JSON.stringify(cellColours));
            // reflect immediately
            // update any existing cells on page
            document.querySelectorAll('.cell.icon').forEach(el => {
              const iconUrl = el.style.getPropertyValue('--cell-icon') || '';
              // try to derive subject from icon URL
              const match = iconUrl.match(/([^/\\]+)\.png\)/);
              if (match) {
                const filename = match[1];
                // map filename back to subject key where possible
                const subj = Object.keys(iconMap).find(k => iconMap[k] && iconMap[k].includes(filename));
                const c = (subj && cellColours[subj]) || localStorage.getItem('cellColour') || '#ffffff';
                el.style.setProperty('--cell-colour', c);
              }
            });
          }

  }
  // SEARCH MODE
  else {
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
    localStorage.setItem('goodToGoSeenDate', todayKey());
  }

  // Reset to greeting
  exitTypingMode();
});

const PARALLAX_STRENGTH = 10; // px (tweak this)

document.addEventListener("mousemove", (e) => {
  if (!bgSettings.parallax) return;

  const x = e.clientX / window.innerWidth - 0.5;
  const y = e.clientY / window.innerHeight - 0.5;

  const offsetX = -x * PARALLAX_STRENGTH;
  const offsetY = -y * PARALLAX_STRENGTH;

  document.body.style.backgroundPosition =
    `calc(50% + ${offsetX}px) calc(50% + ${offsetY}px)`;
});


window.addEventListener('DOMContentLoaded', () => {
  // Font
  const savedFont = localStorage.getItem('userFont');
  if (savedFont) document.documentElement.style.setProperty('--font', savedFont);

  // Colours & outlines
  const fontVars = JSON.parse(localStorage.getItem('fontVars') || '{}');
  Object.keys(fontVars).forEach(varName => {
    document.documentElement.style.setProperty(`--${varName}`, fontVars[varName]);
  });
});

const savedCellColour = localStorage.getItem('cellColour');
if (savedCellColour) {
  document.documentElement.style.setProperty('--cell-colour', savedCellColour);
}

    setInterval(updateActive, 60000);
    let lastDayKey = todayKey();

    setInterval(() => {
      const currentKey = todayKey();
      if (currentKey !== lastDayKey) {
        lastDayKey = currentKey;
      
        updateClock();        // updates "Day X / Weekend"
        renderTimetable();    // re-dims & highlights
      }
    }, 30 * 1000); // check every 30 seconds

    function scheduleMidnightUpdate() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
    
      setTimeout(() => {
        updateClock();
        renderTimetable();
        scheduleMidnightUpdate();
      }, midnight - now);
    }
    
    scheduleMidnightUpdate();



    //updateActive();

    /* ---------------- LOCAL STORAGE (FUTURE USE) ---------------- */
    // Example: store SAC dates
    // localStorage.setItem('sacs', JSON.stringify([]));

