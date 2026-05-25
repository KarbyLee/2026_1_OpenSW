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
  fonts: { week:'#222222', sat:'#1b6ae3', sun:'#e31b20' },
};

const DARK_THEME = {
  bg: '#000000',
  defaultCell: '#1f1f1f',
  otherCell: '#777777',
  otherOpacity: 0.3,
  highlight: '#ffffff',
  highlightOpacity: 0.16,
  fonts: { week:'#eeeeee', sat:'#8bb7ff', sun:'#ff8c8c' },
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
  cal.querySelectorAll('.p-num:not(.red):not(.blue):not(.other), .p-memo, .cal-title').forEach(el => {
    el.style.color = fontColors.week;
  });
  cal.querySelectorAll('.p-num.blue').forEach(el => { el.style.color = fontColors.sat; });
  cal.querySelectorAll('.p-num.red, .p-holiday').forEach(el => { el.style.color = fontColors.sun; });
};

const setFontColor = (key, hex) => {
  fontColors[key] = hex;
  fontPickers[key].syncTo(hex);
  document.getElementById(`dot-${key}`).style.background = hex;
  applyFontColors();
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
  },
});

const fontPickers = {
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
  ['week', 'sat', 'sun'].forEach(key => fontPickers[key].syncTo(fontColors[key]));
};

const applyTheme = (theme) => {
  applyBg(theme.bg);
  applyDefaultCellColor(theme.defaultCell);
  applyOtherColor(theme.otherCell);
  applyOtherOpacity(theme.otherOpacity * 100);
  applyHighlightColor(theme.highlight);
  applyHighlightOpacity(theme.highlightOpacity * 100);
  ['week', 'sat', 'sun'].forEach(key => setFontColor(key, theme.fonts[key]));
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
    const isOpen = panel.classList.contains('open');

    document.querySelectorAll('.toggle-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.toggle-header').forEach(h => h.classList.remove('open'));

    if (!isOpen) {
      panel.classList.add('open');
      header.classList.add('open');
    }
  });
});

// ===== 폰트 종류 =====
document.getElementById('fontFamily').addEventListener('change', (e) => {
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

sizeInput.addEventListener('input', (e) => applyFontSize(e.target.value));
sizeInput.addEventListener('change', (e) => applyFontSize(e.target.value));

document.getElementById('sizeUp').addEventListener('click', () => {
  applyFontSize(parseInt(sizeInput.value, 10) + 1);
});
document.getElementById('sizeDown').addEventListener('click', () => {
  applyFontSize(parseInt(sizeInput.value, 10) - 1);
});

// ===== 저장 =====
document.getElementById('btnDecoSave').addEventListener('click', () => {
  localStorage.setItem('decoFont', document.getElementById('fontFamily').value);
  localStorage.setItem('decoFontSize', sizeInput.value + 'px');
  localStorage.setItem('decoBg', currentBg);
  localStorage.setItem('decoFontColor-week', fontColors.week);
  localStorage.setItem('decoFontColor-sat', fontColors.sat);
  localStorage.setItem('decoFontColor-sun', fontColors.sun);
  localStorage.setItem('decoDefaultCellColor', defaultCellColor);
  localStorage.setItem('decoOtherColor', otherCellColor);
  localStorage.setItem('decoOtherOpacity', String(otherCellOpacity));
  localStorage.setItem('decoHighlightColor', highlightColor);
  localStorage.setItem('decoHighlightOpacity', String(highlightOpacity));
  alert('설정이 저장되었습니다!');
});

// 적용 버튼은 아직 기능 없음

// ===== 나가기 =====
document.getElementById('btnDecoExit').addEventListener('click', () => {
  location.href = 'index.html';
});

// ===== 불러오기 =====
window.onload = () => {
  bgPicker.init();
  defaultCellPicker.init();
  otherPicker.init();
  highlightPicker.init();
  Object.values(fontPickers).forEach(p => p.init());

  const savedFont = localStorage.getItem('decoFont');
  const savedFontSize = localStorage.getItem('decoFontSize');
  const savedBg = localStorage.getItem('decoBg') || LIGHT_THEME.bg;
  const savedDefaultCell = localStorage.getItem('decoDefaultCellColor') || LIGHT_THEME.defaultCell;
  const savedOther = localStorage.getItem('decoOtherColor') || LIGHT_THEME.otherCell;
  const savedOtherOpacity = Number(localStorage.getItem('decoOtherOpacity') || LIGHT_THEME.otherOpacity) * 100;
  const savedHighlight = localStorage.getItem('decoHighlightColor') || LIGHT_THEME.highlight;
  const savedHighlightOpacity = Number(localStorage.getItem('decoHighlightOpacity') || LIGHT_THEME.highlightOpacity) * 100;

  if (savedFont) {
    document.getElementById('fontFamily').value = savedFont;
    document.getElementById('previewCal').style.fontFamily = savedFont;
  }

  if (savedFontSize) {
    const n = parseInt(savedFontSize, 10);
    sizeInput.value = n;
    document.getElementById('previewCal').style.fontSize = savedFontSize;
  }

  applyBg(savedBg);
  bgPicker.syncTo(savedBg);

  ['week', 'sat', 'sun'].forEach(key => {
    const saved = localStorage.getItem(`decoFontColor-${key}`);
    const hex = saved || FONT_DEFAULTS[key];
    fontColors[key] = hex;
    fontPickers[key].syncTo(hex);
    document.getElementById(`dot-${key}`).style.background = hex;
  });
  applyFontColors();

  applyDefaultCellColor(savedDefaultCell);
  defaultCellPicker.syncTo(savedDefaultCell);

  applyOtherColor(savedOther);
  otherPicker.syncTo(savedOther);
  applyOtherOpacity(savedOtherOpacity);

  applyHighlightColor(savedHighlight);
  highlightPicker.syncTo(savedHighlight);
  applyHighlightOpacity(savedHighlightOpacity);
};
