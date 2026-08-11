const STORAGE_KEY = 'kidsScreenTimeData';
const LIMIT = 30; // minutes per category
const INCREMENT = 10;

const CATEGORIES = [
  { id: 'videoGames', name: 'Video Games', icon: '🎮' },
  { id: 'tvShow', name: 'TV Show', icon: '📺' },
  { id: 'movie', name: 'Movie', icon: '🎬' },
  { id: 'flexTime', name: 'Flex Time', icon: '✨' },
];

const CHILDREN = [
  { id: 'jacob', name: 'Jacob', colorClass: 'jacob' },
  { id: 'liam', name: 'Liam', colorClass: 'liam' },
];

/** Screen day starts at 4:00 AM local time */
function getCurrentDayKey() {
  const now = new Date();
  // If before 4 AM, count it as the previous calendar day
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createEmptyUsage() {
  return CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = 0;
    return acc;
  }, {});
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage', e);
  }
}

function ensureFreshData() {
  const dayKey = getCurrentDayKey();
  let data = loadData();

  if (!data || data.dayKey !== dayKey) {
    data = {
      dayKey,
      jacob: createEmptyUsage(),
      liam: createEmptyUsage(),
    };
    saveData(data);
  }
  return data;
}

function formatDay(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ---- State & Render ----
let data = ensureFreshData();
let justUpdated = null; // { childId, catId }

function addTime(childId, categoryId) {
  const current = data[childId][categoryId] || 0;
  if (current >= LIMIT) return;

  const nextValue = Math.min(current + INCREMENT, LIMIT);
  data = {
    ...data,
    [childId]: {
      ...data[childId],
      [categoryId]: nextValue,
    },
  };
  saveData(data);

  justUpdated = { childId, catId: categoryId };
  render();
  setTimeout(() => {
    justUpdated = null;
    render();
  }, 400);
}

function render() {
  const root = document.getElementById('root');
  if (!root) return;

  const dayLabel = formatDay(data.dayKey);

  let html = `
    <div class="app">
      <header class="header">
        <h1>Screen Time</h1>
        <p class="subtitle">Tap +10 min after you finish watching</p>
        <div class="day-badge">Today · ${dayLabel} · Resets 4 AM</div>
      </header>
      <div class="children">
  `;

  for (const child of CHILDREN) {
    html += `
      <section class="child-card ${child.colorClass}">
        <div class="child-header">
          <h2 class="child-name">${child.name}</h2>
        </div>
        <div class="categories">
    `;

    for (const cat of CATEGORIES) {
      const used = data[child.id]?.[cat.id] ?? 0;
      const remaining = Math.max(0, LIMIT - used);
      const exhausted = remaining === 0;
      const percent = Math.min(100, (used / LIMIT) * 100);
      const isJust =
        justUpdated &&
        justUpdated.childId === child.id &&
        justUpdated.catId === cat.id;

      const statsHtml = exhausted
        ? `<span class="used-up">All used ✓</span>`
        : `<span>${used} used</span> · <span class="left">${remaining} left</span>`;

      const btnText = exhausted ? 'Done for today' : '+ 10 min';
      const btnDisabled = exhausted ? 'disabled' : '';
      const fillClass = exhausted ? 'full' : child.colorClass;

      html += `
        <div class="category ${exhausted ? 'exhausted' : ''} ${isJust ? 'just-updated' : ''}">
          <div class="category-top">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-info">
              <div class="category-name">${cat.name}</div>
              <div class="category-stats">${statsHtml}</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${fillClass}" style="width: ${percent}%"></div>
          </div>
          <button
            class="add-btn ${child.colorClass}"
            ${btnDisabled}
            data-child="${child.id}"
            data-cat="${cat.id}"
            aria-label="Add 10 minutes of ${cat.name} for ${child.name}"
          >
            ${btnText}
          </button>
        </div>
      `;
    }

    html += `
        </div>
      </section>
    `;
  }

  html += `
      </div>
      <footer class="footer">
        <p>Data stays on this device · Resets automatically at 4:00 AM</p>
        <p>Add to Home Screen for the best experience</p>
      </footer>
    </div>
  `;

  root.innerHTML = html;

  // Attach click handlers
  root.querySelectorAll('.add-btn:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => {
      const childId = btn.getAttribute('data-child');
      const catId = btn.getAttribute('data-cat');
      addTime(childId, catId);
    });
  });
}

// Initial render + periodic day check
render();

setInterval(() => {
  const dayKey = getCurrentDayKey();
  if (data.dayKey !== dayKey) {
    data = {
      dayKey,
      jacob: createEmptyUsage(),
      liam: createEmptyUsage(),
    };
    saveData(data);
    render();
  }
}, 60_000);
