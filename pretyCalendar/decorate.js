// ===== 미리보기 캘린더 =====
const FIRST_DOW = 3; // 수요일 시작
const TOTAL_DAYS = 30;
const HOLIDAY_DAY = 7;
const MEMO_DAY = 1;
const TODAY_DAY = 5;
const PREV_LAST = 28;

const board = document.getElementById('previewBoard');

const renderPreview = () => {
  const totalCells = Math.ceil((FIRST_DOW + TOTAL_DAYS) / 7) * 7;
  let html = '';

  // 이전 달
  for (let i = 0; i < FIRST_DOW; i++) {
    const d = PREV_LAST - (FIRST_DOW - 1 - i);
    html += `<div class="p-cell p-other">
      <div class="p-day-top"><span class="p-num other">${d}</span></div>
    </div>`;
  }

  // 이번 달
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    const dow = (FIRST_DOW + i - 1) % 7;
    const isSun = dow === 0;
    const isSat = dow === 6;
    const isHoliday = i === HOLIDAY_DAY;
    const isMemo = i === MEMO_DAY;
    const isToday = i === TODAY_DAY;

    let numClass = 'p-num';
    if (isSun || isHoliday) numClass += ' red';
    else if (isSat) numClass += ' blue';
    if (isToday) numClass += ' today-num';

    html += `<div class="p-cell${isToday ? ' p-today' : ''}">
      <div class="p-day-top">
        <span class="${numClass}">${i}</span>
        ${isHoliday ? `<span class="p-holiday">공휴일</span>` : ''}
      </div>
      ${isMemo ? `<span class="p-memo">메모가 적혀있어요</span>` : ''}
    </div>`;
  }

  // 다음 달
  let nextDay = 1;
  for (let i = FIRST_DOW + TOTAL_DAYS; i < totalCells; i++) {
    html += `<div class="p-cell p-other">
      <div class="p-day-top"><span class="p-num other">${nextDay++}</span></div>
    </div>`;
  }

  board.innerHTML = html;
};

renderPreview();

// ===== 상태 =====
let currentBg = '#ffffff';
let defaultCellColor = '#ffffff';
let otherCellColor = '#969696';
let highlightColor = '#646464';
let otherCellOpacity = 0.3;
let highlightOpacity = 0.13;

const LIGHT_THEME = {
  bg: '#ffffff',
  defaultCell: '#ffffff',
  otherCell: '#969696',
  otherOpacity: 0.3,
  highlight: '#646464',
  highlightOpacity: 0.13,
  fonts: { title:'#222222', week:'#222222', sat:'#1b6ae3', sun:'#e31b20' },
};

const DARK_THEME = {
  bg: '#000000',
  defaultCell: '#1f1f1f',
  otherCell: '#777777',
  otherOpacity: 0.3,
  highlight: '#ffffff',
  highlightOpacity: 0.16,
  fonts: { title:'#eeeeee', week:'#eeeeee', sat:'#8bb7ff', sun:'#ff8c8c' },
};

// ===== 공통 색상 유틸 =====
const hsbToHex = (h, s, b) => {
  const l = b * (1 - s / 2);
  const sl = (l === 0 || l === 1) ? 0 : (b - l) / Math.min(l, 1 - l);
  const a = sl * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), diff = max - min;
  let h = 0;
  if (diff) {
    if (max === r) h = ((g - b) / diff % 6) * 60;
    else if (max === g) h = ((b - r) / diff + 2) * 60;
    else h = ((r - g) / diff + 4) * 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: max ? diff / max : 0, b: max };
};

const hexToRgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const hexToRgba = (hex, opacity) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${opacity})`;
};

const percentText = (opacity) => `${Math.round(opacity * 100)}%`;

// ===== 저장 상태 추적 =====
let isSaved = true; // 처음엔 기본값 상태 = 저장됨으로 간주

const markUnsaved = () => { isSaved = false; };

// ===== 피커 팩토리 =====
const makePicker = ({ boxId, cursorId, hueId, hexInputId, dotId, onChange }) => {
  let hue = 0, sat = 1, bri = 1, dragging = false;

  const box = document.getElementById(boxId);
  const cursor = document.getElementById(cursorId);
  const hueEl = document.getElementById(hueId);
  const hexEl = document.getElementById(hexInputId);
  const dotEl = document.getElementById(dotId);

  if (!box || !cursor || !hueEl || !hexEl || !dotEl) {
    return { syncTo: () => {}, init: () => {} };
  }

  const updateBoxBg = () => { box.style.background = `hsl(${hue},100%,50%)`; };
  const updateCursor = () => {
    cursor.style.left = (sat * box.offsetWidth) + 'px';
    cursor.style.top = ((1 - bri) * box.offsetHeight) + 'px';
  };
  const emit = () => {
    const hex = hsbToHex(hue, sat, bri);
    dotEl.style.background = hex;
    hexEl.value = hex.slice(1);
    markUnsaved();
    onChange(hex);
  };
  const dragBox = (e) => {
    const rect = box.getBoundingClientRect();
    sat = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    bri = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    updateCursor();
    emit();
  };

  box.addEventListener('mousedown', e => { dragging = true; dragBox(e); });
  document.addEventListener('mousemove', e => { if (dragging) dragBox(e); });
  document.addEventListener('mouseup', () => { dragging = false; });

  hueEl.addEventListener('input', e => {
    hue = parseInt(e.target.value, 10);
    updateBoxBg();
    emit();
  });

  hexEl.addEventListener('input', e => {
    const v = e.target.value.trim();
    if (v.length === 6 && /^[0-9a-fA-F]{6}$/.test(v)) {
      const h = hexToHsb('#' + v);
      hue = h.h;
      sat = h.s;
      bri = h.b;
      hueEl.value = hue;
      updateBoxBg();
      updateCursor();
      dotEl.style.background = '#' + v;
      markUnsaved();
      onChange('#' + v);
    }
  });

  const syncTo = (hex) => {
    const h = hexToHsb(hex);
    hue = h.h;
    sat = h.s;
    bri = h.b;
    hueEl.value = hue;
    updateBoxBg();
    updateCursor();
    dotEl.style.background = hex;
    hexEl.value = hex.slice(1);
  };

  return { syncTo, init: () => { updateBoxBg(); updateCursor(); } };
};

// ===== 폰트 색상 =====
const FONT_DEFAULTS = { ...LIGHT_THEME.fonts };
const fontColors = { ...FONT_DEFAULTS };

const applyFontColors = () => {
  const cal = document.getElementById('previewCal');
  cal.querySelectorAll('.p-num:not(.red):not(.blue):not(.other), .p-memo').forEach(el => {
    el.style.color = fontColors.week;
  });
  cal.querySelectorAll('.p-num.blue').forEach(el => { el.style.color = fontColors.sat; });
  cal.querySelectorAll('.p-num.red, .p-holiday').forEach(el => { el.style.color = fontColors.sun; });
};

const applyTitleColor = () => {
  document.querySelector('.cal-title').style.color = fontColors.title;
};

const setFontColor = (key, hex) => {
  fontColors[key] = hex;
  fontPickers[key].syncTo(hex);
  document.getElementById(`dot-${key}`).style.background = hex;
  applyFontColors();
  applyTitleColor();
};

const makeFontPicker = (key) => makePicker({
  boxId:`fontRgbBox-${key}`,
  cursorId:`fontRgbCursor-${key}`,
  hueId:`fontHue-${key}`,
  hexInputId:`fontHex-${key}`,
  dotId:`fontDot-${key}`,
  onChange: (hex) => {
    fontColors[key] = hex;
    document.getElementById(`dot-${key}`).style.background = hex;
    applyFontColors();
    applyTitleColor();
  },
});

const fontPickers = {
  title: makeFontPicker('title'),
  week: makeFontPicker('week'),
  sat: makeFontPicker('sat'),
  sun: makeFontPicker('sun'),
};

// ===== 백그라운드 =====
const applyBg = (hex) => {
  currentBg = hex;
  const cal = document.getElementById('previewCal');
  cal.style.background = hex;
  document.getElementById('dot-bg').style.background = hex;

  document.querySelectorAll('.bg-options .deco-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.bg === hex);
  });
};

const applyDefaultCellColor = (hex) => {
  defaultCellColor = hex;
  document.getElementById('previewCal').style.setProperty('--default-cell-color', hex);
  document.getElementById('dot-defaultCell').style.background = hex;
};

const applyOtherColor = (hex) => {
  otherCellColor = hex;
  document.getElementById('previewCal').style.setProperty('--other-cell-color', hexToRgba(hex, otherCellOpacity));
  document.getElementById('previewCal').style.setProperty('--other-number-color', hex);
  document.getElementById('dot-otherCell').style.background = hex;
};

const applyHighlightColor = (hex) => {
  highlightColor = hex;
  const { r, g, b } = hexToRgb(hex);
  document.getElementById('previewCal').style.setProperty('--highlight-rgb', `${r},${g},${b}`);
  document.getElementById('dot-highlight').style.background = hex;
};

const applyOtherOpacity = (value) => {
  const opacity = Math.max(0, Math.min(1, Number(value) / 100));
  otherCellOpacity = opacity;
  document.getElementById('previewCal').style.setProperty('--other-cell-color', hexToRgba(otherCellColor, opacity));
  document.getElementById('previewCal').style.setProperty('--other-number-opacity', opacity);
  document.getElementById('otherOpacity').value = Math.round(opacity * 100);
  document.getElementById('otherOpacityBadge').textContent = percentText(opacity);
};

const applyHighlightOpacity = (value) => {
  const opacity = Math.max(0, Math.min(1, Number(value) / 100));
  highlightOpacity = opacity;
  const borderOpacity = Math.min(1, opacity + 0.22);
  document.getElementById('previewCal').style.setProperty('--highlight-opacity', opacity);
  document.getElementById('previewCal').style.setProperty('--highlight-border-opacity', borderOpacity);
  document.getElementById('highlightOpacity').value = Math.round(opacity * 100);
  document.getElementById('highlightOpacityBadge').textContent = percentText(opacity);
};

const bgPicker = makePicker({
  boxId:'bgRgbBox',
  cursorId:'bgRgbCursor',
  hueId:'bgHueSlider',
  hexInputId:'bgHexInput',
  dotId:'bgColorDot',
  onChange: (hex) => applyBg(hex),
});

const defaultCellPicker = makePicker({
  boxId:'defaultCellRgbBox',
  cursorId:'defaultCellRgbCursor',
  hueId:'defaultCellHueSlider',
  hexInputId:'defaultCellHexInput',
  dotId:'defaultCellColorDot',
  onChange: (hex) => applyDefaultCellColor(hex),
});

const otherPicker = makePicker({
  boxId:'otherRgbBox',
  cursorId:'otherRgbCursor',
  hueId:'otherHueSlider',
  hexInputId:'otherHexInput',
  dotId:'otherColorDot',
  onChange: (hex) => applyOtherColor(hex),
});

const highlightPicker = makePicker({
  boxId:'highlightRgbBox',
  cursorId:'highlightRgbCursor',
  hueId:'highlightHueSlider',
  hexInputId:'highlightHexInput',
  dotId:'highlightColorDot',
  onChange: (hex) => applyHighlightColor(hex),
});

const syncThemePickers = () => {
  bgPicker.syncTo(currentBg);
  defaultCellPicker.syncTo(defaultCellColor);
  otherPicker.syncTo(otherCellColor);
  highlightPicker.syncTo(highlightColor);
  ['title', 'week', 'sat', 'sun'].forEach(key => fontPickers[key].syncTo(fontColors[key]));
};

const applyTheme = (theme) => {
  applyBg(theme.bg);
  applyDefaultCellColor(theme.defaultCell);
  applyOtherColor(theme.otherCell);
  applyOtherOpacity(theme.otherOpacity * 100);
  applyHighlightColor(theme.highlight);
  applyHighlightOpacity(theme.highlightOpacity * 100);
  ['title', 'week', 'sat', 'sun'].forEach(key => setFontColor(key, theme.fonts[key]));
  syncThemePickers();
};

// ===== 이벤트 =====
document.querySelectorAll('.bg-options .deco-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme === 'dark' ? DARK_THEME : LIGHT_THEME);
  });
});

document.getElementById('otherOpacity').addEventListener('input', e => applyOtherOpacity(e.target.value));
document.getElementById('highlightOpacity').addEventListener('input', e => applyHighlightOpacity(e.target.value));

document.querySelectorAll('.reset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    const def = '#' + btn.dataset.default;
    if (key.startsWith('headfont-')) {
      const sub = key.replace('headfont-', '');
      headFontColors[sub] = def;
      headFontPickers[sub].syncTo(def);
      document.getElementById(`dot-headfont-${sub}`).style.background = def;
      applyHeadFontColors();
      return;
    }
    if (key.startsWith('head-')) {
      const sub = key.replace('head-', '');
      headColors[sub] = def;
      headPickers[sub].syncTo(def);
      document.getElementById(`dot-head-${sub}`).style.background = def;
      applyHeadColors();
      return;
    }

    if (key === 'defaultCell') {
      applyDefaultCellColor(def);
      defaultCellPicker.syncTo(def);
      return;
    }

    if (key === 'other') {
      applyOtherColor(def);
      otherPicker.syncTo(def);
      applyOtherOpacity(30);
      return;
    }

    if (key === 'highlight') {
      applyHighlightColor(def);
      highlightPicker.syncTo(def);
      applyHighlightOpacity(13);
      return;
    }

    setFontColor(key, def);
  });
});

document.querySelectorAll('.toggle-header').forEach(header => {
  header.addEventListener('click', () => {
    const panel = document.getElementById(header.dataset.target);
    if (!panel) return;
    const isOpen = panel.classList.contains('open');

    // 같은 toggle-group 부모의 형제 패널들만 닫기 (섹션 독립)
    const parentSection = header.closest('section, .deco-row');
    if (parentSection) {
      parentSection.querySelectorAll('.toggle-panel').forEach(p => p.classList.remove('open'));
      parentSection.querySelectorAll('.toggle-header').forEach(h => h.classList.remove('open'));
    }

    if (!isOpen) {
      panel.classList.add('open');
      header.classList.add('open');
    }
  });
});

// ===== 폰트 종류 =====
document.getElementById('fontFamily').addEventListener('change', (e) => {
  markUnsaved();
  const cal = document.getElementById('previewCal');
  cal.style.fontFamily = e.target.value;
  cal.querySelectorAll('*').forEach(el => el.style.fontFamily = 'inherit');
});

// ===== 폰트 사이즈 =====
const sizeInput = document.getElementById('fontSize');

const applyFontSize = (val) => {
  let n = parseInt(val, 10);
  if (isNaN(n)) return;
  n = Math.max(8, Math.min(32, n));
  sizeInput.value = n;
  document.getElementById('previewCal').style.fontSize = n + 'px';
};

sizeInput.addEventListener('input', (e) => { markUnsaved(); applyFontSize(e.target.value); });
sizeInput.addEventListener('change', (e) => { markUnsaved(); applyFontSize(e.target.value); });

document.getElementById('sizeUp').addEventListener('click', () => {
  applyFontSize(parseInt(sizeInput.value, 10) + 1);
});
document.getElementById('sizeDown').addEventListener('click', () => {
  applyFontSize(parseInt(sizeInput.value, 10) - 1);
});

// ===== 요일 헤더 색상 =====
const HEAD_DEFAULTS = { week: '#333333', sat: '#1b6ae3', sun: '#e31b20' };
const headColors = { week: '#333333', sat: '#1b6ae3', sun: '#e31b20' };

const applyHeadColors = () => {
  const cal = document.getElementById('previewCal');
  // 평일 헤더 (sun, sat 제외)
  cal.style.setProperty('--head-week-color', headColors.week);
  cal.style.setProperty('--head-sat-color',  headColors.sat);
  cal.style.setProperty('--head-sun-color',  headColors.sun);
};

const headPickers = {
  week: makePicker({
    boxId: 'headRgbBox-week', cursorId: 'headRgbCursor-week',
    hueId: 'headHue-week', hexInputId: 'headHex-week', dotId: 'headDot-week',
    onChange: (hex) => {
      headColors.week = hex;
      document.getElementById('dot-head-week').style.background = hex;
      applyHeadColors();
    },
  }),
  sat: makePicker({
    boxId: 'headRgbBox-sat', cursorId: 'headRgbCursor-sat',
    hueId: 'headHue-sat', hexInputId: 'headHex-sat', dotId: 'headDot-sat',
    onChange: (hex) => {
      headColors.sat = hex;
      document.getElementById('dot-head-sat').style.background = hex;
      applyHeadColors();
    },
  }),
  sun: makePicker({
    boxId: 'headRgbBox-sun', cursorId: 'headRgbCursor-sun',
    hueId: 'headHue-sun', hexInputId: 'headHex-sun', dotId: 'headDot-sun',
    onChange: (hex) => {
      headColors.sun = hex;
      document.getElementById('dot-head-sun').style.background = hex;
      applyHeadColors();
    },
  }),
};

// ===== 요일칸 폰트 색상 =====
const HEAD_FONT_DEFAULTS = { week: '#ffffff', sat: '#ffffff', sun: '#ffffff' };
const headFontColors = { week: '#ffffff', sat: '#ffffff', sun: '#ffffff' };

const applyHeadFontColors = () => {
  const cal = document.getElementById('previewCal');
  cal.style.setProperty('--head-font-week-color', headFontColors.week);
  cal.style.setProperty('--head-font-sat-color',  headFontColors.sat);
  cal.style.setProperty('--head-font-sun-color',  headFontColors.sun);
};

const headFontPickers = {
  week: makePicker({
    boxId: 'headFontRgbBox-week', cursorId: 'headFontRgbCursor-week',
    hueId: 'headFontHue-week', hexInputId: 'headFontHex-week', dotId: 'headFontDot-week',
    onChange: (hex) => {
      headFontColors.week = hex;
      document.getElementById('dot-headfont-week').style.background = hex;
      applyHeadFontColors();
    },
  }),
  sat: makePicker({
    boxId: 'headFontRgbBox-sat', cursorId: 'headFontRgbCursor-sat',
    hueId: 'headFontHue-sat', hexInputId: 'headFontHex-sat', dotId: 'headFontDot-sat',
    onChange: (hex) => {
      headFontColors.sat = hex;
      document.getElementById('dot-headfont-sat').style.background = hex;
      applyHeadFontColors();
    },
  }),
  sun: makePicker({
    boxId: 'headFontRgbBox-sun', cursorId: 'headFontRgbCursor-sun',
    hueId: 'headFontHue-sun', hexInputId: 'headFontHex-sun', dotId: 'headFontDot-sun',
    onChange: (hex) => {
      headFontColors.sun = hex;
      document.getElementById('dot-headfont-sun').style.background = hex;
      applyHeadFontColors();
    },
  }),
};

// ===== 스타일 불러오기 / 적용 =====
const buildTheme = () => ({
  font:     document.getElementById('fontFamily').value,
  fontSize: sizeInput.value + 'px',
  bg:       currentBg,
  fontColors:     { ...fontColors },
  defaultCell:    defaultCellColor,
  otherCell:      otherCellColor,
  otherOpacity,
  highlightColor,
  highlightOpacity,
  headColors:     { ...headColors },
  headFontColors: { ...headFontColors },
});

const showConfirm = (msg) => new Promise(resolve => {
  const overlay = document.getElementById('confirmOverlay');
  const msgEl = document.getElementById('confirmMsg');
  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');

  msgEl.textContent = msg;
  overlay.classList.add('active');

  const close = (answer) => {
    overlay.classList.remove('active');
    yesBtn.removeEventListener('click', onYes);
    noBtn.removeEventListener('click', onNo);
    resolve(answer);
  };
  const onYes = () => close(true);
  const onNo = () => close(false);

  yesBtn.addEventListener('click', onYes);
  noBtn.addEventListener('click', onNo);
});

const setHeadColor = (key, hex) => {
  headColors[key] = hex;
  headPickers[key].syncTo(hex);
  document.getElementById(`dot-head-${key}`).style.background = hex;
};

const setHeadFontColor = (key, hex) => {
  headFontColors[key] = hex;
  headFontPickers[key].syncTo(hex);
  document.getElementById(`dot-headfont-${key}`).style.background = hex;
};

const loadThemeIntoEditor = (theme) => {
  const loaded = {
    bg: theme.bg || LIGHT_THEME.bg,
    defaultCell: theme.defaultCell || LIGHT_THEME.defaultCell,
    otherCell: theme.otherCell || LIGHT_THEME.otherCell,
    otherOpacity: theme.otherOpacity ?? LIGHT_THEME.otherOpacity,
    highlightColor: theme.highlightColor || LIGHT_THEME.highlight,
    highlightOpacity: theme.highlightOpacity ?? LIGHT_THEME.highlightOpacity,
    fontColors: { ...FONT_DEFAULTS, ...(theme.fontColors || {}) },
    headColors: theme.headColors || HEAD_DEFAULTS,
    headFontColors: theme.headFontColors || HEAD_FONT_DEFAULTS,
  };

  if (theme.font) {
    document.getElementById('fontFamily').value = theme.font;
    const cal = document.getElementById('previewCal');
    cal.style.fontFamily = theme.font;
    cal.querySelectorAll('*').forEach(el => el.style.fontFamily = 'inherit');
  }

  if (theme.fontSize) {
    applyFontSize(parseInt(theme.fontSize, 10));
  }

  applyBg(loaded.bg);
  bgPicker.syncTo(loaded.bg);

  applyDefaultCellColor(loaded.defaultCell);
  defaultCellPicker.syncTo(loaded.defaultCell);

  applyOtherColor(loaded.otherCell);
  otherPicker.syncTo(loaded.otherCell);
  applyOtherOpacity(loaded.otherOpacity * 100);

  applyHighlightColor(loaded.highlightColor);
  highlightPicker.syncTo(loaded.highlightColor);
  applyHighlightOpacity(loaded.highlightOpacity * 100);

  ['title', 'week', 'sat', 'sun'].forEach(key => {
    setFontColor(key, loaded.fontColors[key] || FONT_DEFAULTS[key]);
    if (key !== 'title') {
      setHeadColor(key, loaded.headColors[key] || HEAD_DEFAULTS[key]);
      setHeadFontColor(key, loaded.headFontColors[key] || HEAD_FONT_DEFAULTS[key]);
    }
  });

  applyFontColors();
  applyHeadColors();
  applyHeadFontColors();
  applyTitleColor();
  isSaved = true;
};

document.getElementById('btnDecoSave').addEventListener('click', async () => {
  const yes = await showConfirm('스타일을 불러오시겠습니까?');
  if (!yes) return;

  const raw = localStorage.getItem('calendarTheme');
  if (!raw) {
    alert('인덱스에 적용된 스타일이 없습니다.');
    return;
  }

  try {
    loadThemeIntoEditor(JSON.parse(raw));
  } catch (e) {
    alert('스타일을 불러오지 못했습니다.');
  }
});

document.getElementById('btnDecoApply').addEventListener('click', () => {
  localStorage.setItem('calendarTheme', JSON.stringify(buildTheme()));
  isSaved = true;
  alert('적용되었습니다!');
  location.href = 'index.html';
});
// ===== 나가기 =====
document.getElementById('btnDecoExit').addEventListener('click', () => {
  location.href = 'index.html';
});

// ===== 초기화 (항상 기본값으로 시작) =====
window.onload = () => {
  isSaved = true; // 기본값 상태 = 저장 필요 없음
  bgPicker.init();
  defaultCellPicker.init();
  otherPicker.init();
  highlightPicker.init();
  Object.values(fontPickers).forEach(p => p.init());
  Object.values(headPickers).forEach(p => p.init());
  Object.values(headFontPickers).forEach(p => p.init());

  // 기본값으로 피커 초기화
  applyBg(LIGHT_THEME.bg);
  bgPicker.syncTo(LIGHT_THEME.bg);

  applyDefaultCellColor(LIGHT_THEME.defaultCell);
  defaultCellPicker.syncTo(LIGHT_THEME.defaultCell);

  applyOtherColor(LIGHT_THEME.otherCell);
  otherPicker.syncTo(LIGHT_THEME.otherCell);
  applyOtherOpacity(LIGHT_THEME.otherOpacity * 100);

  applyHighlightColor(LIGHT_THEME.highlight);
  highlightPicker.syncTo(LIGHT_THEME.highlight);
  applyHighlightOpacity(LIGHT_THEME.highlightOpacity * 100);

  ['title', 'week', 'sat', 'sun'].forEach(key => {
    fontColors[key] = FONT_DEFAULTS[key];
    fontPickers[key].syncTo(FONT_DEFAULTS[key]);
    document.getElementById(`dot-${key}`).style.background = FONT_DEFAULTS[key];
  });
  applyFontColors();
  applyTitleColor();

  ['week', 'sat', 'sun'].forEach(key => {
    headColors[key] = HEAD_DEFAULTS[key];
    headPickers[key].syncTo(HEAD_DEFAULTS[key]);
    document.getElementById(`dot-head-${key}`).style.background = HEAD_DEFAULTS[key];
  });
  applyHeadColors();

  ['week', 'sat', 'sun'].forEach(key => {
    headFontColors[key] = HEAD_FONT_DEFAULTS[key];
    headFontPickers[key].syncTo(HEAD_FONT_DEFAULTS[key]);
    document.getElementById(`dot-headfont-${key}`).style.background = HEAD_FONT_DEFAULTS[key];
  });
  applyHeadFontColors();
};



