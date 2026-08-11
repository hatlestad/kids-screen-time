const STORAGE_KEY = 'kidsScreenTimeData';
const TOTAL_LIMIT = 120; // minutes total per child per day
const INCREMENT = 10;

const CATEGORIES = [
  { id: 'videoGames', name: 'Video Games', icon: '🎮' },
  { id: 'tvShow', name: 'TV Show', icon: '📺' },
  { id: 'movie', name: 'Movie', icon: '🎬' },
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

  // Migrate / reset if day changed or structure is old (had flexTime or per-cat limits)
  if (!data || data.dayKey !== dayKey) {
    data = {
      dayKey,
      jacob: createEmptyUsage(),
      liam: createEmptyUsage(),
    };
    saveData(data);
  } else {
    // Ensure only the current 3 categories exist (clean up any old flexTime)
    for (const child of CHILDREN) {
      const usage = data[child.id] || createEmptyUsage();
      const clean = createEmptyUsage();
      for (const cat of CATEGORIES) {
        clean[cat.id] = usage[cat.id] || 0;
      }
      data[child.id] = clean;
    }
  }
  return data;
}

function getTotal(childId) {
  const usage = data[childId] || {};
  return CATEGORIES.reduce((sum, cat) => sum + (usage[cat.id] || 0), 0);
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
  const total = getTotal(childId);
  if (total >= TOTAL_LIMIT) return;

  const current = data[childId][categoryId] || 0;
  const nextValue = current + INCREMENT;

  // Cap the last increment so we never exceed the total limit
  const newTotal = total - current + nextValue;
  const actualAdd = newTotal > TOTAL_LIMIT ? TOTAL_LIMIT - total : INCREMENT;

  data = {
    ...data,
    [childId]: {
      ...data[childId],
      [categoryId]: current + actualAdd,
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
    const total = getTotal(child.id);
    const remaining = Math.max(0, TOTAL_LIMIT - total);
    const exhausted = remaining === 0;
    const percent = Math.min(100, (total / TOTAL_LIMIT) * 100);

    html += `
      <section class="child-card ${child.colorClass}">
        <div class="child-header">
          <h2 class="child-name">${child.name}</h2>
        </div>

        <!-- Total daily progress -->
        <div class="total-section ${exhausted ? 'exhausted' : ''}">
          <div class="total-top">
            <div class="total-label">Today's Total</div>
            <div class="total-stats">
              ${exhausted
                ? `<span class="used-up">${total} / ${TOTAL_LIMIT} min · All used ✓</span>`
                : `<span>${total} / ${TOTAL_LIMIT} min</span> · <span class="left">${remaining} left</span>`
              }
            </div>
          </div>
          <div class="progress-bar total-bar">
            <div class="progress-fill ${exhausted ? 'full' : child.colorClass}" style="width: ${percent}%"></div>
          </div>
        </div>

        <div class="categories">
    `;

    for (const cat of CATEGORIES) {
      const used = data[child.id]?.[cat.id] ?? 0;
      const isJust =
        justUpdated &&
        justUpdated.childId === child.id &&
        justUpdated.catId === cat.id;

      html += `
        <div class="category ${exhausted ? 'exhausted' : ''} ${isJust ? 'just-updated' : ''}">
          <div class="category-top">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-info">
              <div class="category-name">${cat.name}</div>
              <div class="category-stats">
                <span class="cat-minutes">${used} min</span>
              </div>
            </div>
          </div>
          <button
            class="add-btn ${child.colorClass}"
            ${exhausted ? 'disabled' : ''}
            data-child="${child.id}"
            data-cat="${cat.id}"
            aria-label="Add 10 minutes of ${cat.name} for ${child.name}"
          >
            ${exhausted ? 'Done for today' : '+ 10 min'}
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
