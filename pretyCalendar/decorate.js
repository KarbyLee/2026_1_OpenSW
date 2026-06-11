// ===== 미리보기 캘린더 =====
const FIRST_DOW = 3; // 수요일 시작
const TOTAL_DAYS = 30;
const HOLIDAY_DAY = 7;
const MEMO_DAY = 1;
const TODAY_DAY = 5;
const PREV_LAST = 28;

const board = document.getElementById('previewBoard');

const THEME_DB_NAME = 'prettyCalendarAssetsV3';
const THEME_STORE_NAME = 'themes';
const openThemeDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(THEME_DB_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(THEME_STORE_NAME)) {
      request.result.createObjectStore(THEME_STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const saveFullTheme = async theme => {
  const db = await openThemeDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(THEME_STORE_NAME, 'readwrite');
    transaction.objectStore(THEME_STORE_NAME).put(theme, 'calendarTheme');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
};
const loadFullTheme = async () => {
  const db = await openThemeDb();
  const theme = await new Promise((resolve, reject) => {
    const request = db.transaction(THEME_STORE_NAME, 'readonly').objectStore(THEME_STORE_NAME).get('calendarTheme');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return theme;
};
const deleteFullTheme = async () => {
  const db = await openThemeDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(THEME_STORE_NAME, 'readwrite');
    transaction.objectStore(THEME_STORE_NAME).delete('calendarTheme');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
};
const hasFileAssets = theme =>
  Boolean(theme.bgImage?.dataUrl) ||
  Boolean(theme.stickers?.length);
const makeLightTheme = theme => ({
  ...theme,
  bgImage: theme.bgImage ? { ...theme.bgImage, dataUrl: '' } : null,
  stickers: [],
});

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
let currentBgOpacity = 1;
let defaultCellColor = '#ffffff';
let defaultCellOpacity = 1;
let otherCellColor = '#969696';
let highlightColor = '#646464';
let otherCellOpacity = 0.3;
let highlightOpacity = 0.13;
const fontOpacities = { title:1, week:1, sat:1, sun:1 };
const headOpacities = { week:1, sat:1, sun:1 };
const headFontOpacities = { week:1, sat:1, sun:1 };

const LIGHT_THEME = {
  bg: '#ffffff',
  bgOpacity: 1,
  defaultCell: '#ffffff',
  defaultCellOpacity: 1,
  otherCell: '#969696',
  otherOpacity: 0.3,
  highlight: '#646464',
  highlightOpacity: 0.13,
  fonts: { title:'#222222', week:'#222222', sat:'#1b6ae3', sun:'#e31b20' },
  fontOpacities: { title:1, week:1, sat:1, sun:1 },
  headOpacities: { week:1, sat:1, sun:1 },
  headFontOpacities: { week:1, sat:1, sun:1 },
};

const DARK_THEME = {
  bg: '#000000',
  bgOpacity: 1,
  defaultCell: '#1f1f1f',
  defaultCellOpacity: 1,
  otherCell: '#777777',
  otherOpacity: 0.3,
  highlight: '#ffffff',
  highlightOpacity: 0.16,
  fonts: { title:'#eeeeee', week:'#eeeeee', sat:'#8bb7ff', sun:'#ff8c8c' },
  fontOpacities: { title:1, week:1, sat:1, sun:1 },
  headOpacities: { week:1, sat:1, sun:1 },
  headFontOpacities: { week:1, sat:1, sun:1 },
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
const alphaColor = (hex, opacity = 1) => opacity >= 1 ? hex : hexToRgba(hex, opacity);

const addOpacityControl = (inputId, sliderId, value, onInput) => {
  if (document.getElementById(sliderId)) return;
  const input = document.getElementById(inputId);
  if (!input) return;
  const row = input.closest('.hex-row');
  if (!row) return;
  const wrap = document.createElement('div');
  wrap.className = 'opacity-row';
  wrap.innerHTML = `<label class="opacity-label" for="${sliderId}">불투명도 <span class="opacity-badge" id="${sliderId}Badge">${value}%</span></label><input type="range" class="opacity-slider" id="${sliderId}" min="0" max="100" value="${value}">`;
  row.insertAdjacentElement('afterend', wrap);
  const slider = document.getElementById(sliderId);
  slider.addEventListener('input', e => {
    document.getElementById(`${sliderId}Badge`).textContent = `${e.target.value}%`;
    markUnsaved();
    onInput(Number(e.target.value) / 100);
  });
};

// ===== 배경 이미지 상태 =====
let bgImageDataUrl = null;   // base64 data URL
let bgImgNaturalW = 0;
let bgImgNaturalH = 0;
let bgImgWidthPct = 100;
let bgImgHeightPct = 100;
let bgImgXPct = 50;
let bgImgYPct = 50;
let bgImgOpacityVal = 1.0;

// 비율 고정용 원본 비율
let bgImgAspect = 1; // w/h

const getBgImgLayer = () => {
  let layer = document.getElementById('calBgImageLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'calBgImageLayer';
    layer.className = 'cal-bg-image';
    layer.innerHTML = '<img id="calBgImg" src="" alt="">';
    const cal = document.getElementById('previewCal');
    cal.insertBefore(layer, cal.firstChild);
  }
  return layer;
};

const applyBgImage = () => {
  if (!bgImageDataUrl) return;
  const layer = getBgImgLayer();
  layer.style.display = 'block';
  const img = layer.querySelector('img');
  img.src = bgImageDataUrl;

  const cal = document.getElementById('previewCal');
  const calW = cal.offsetWidth;
  const calH = cal.offsetHeight;

  const imgW = calW * (bgImgWidthPct / 100);
  const imgH = calW * (bgImgHeightPct / 100);

  // X, Y: 0%=왼쪽/위, 50%=가운데, 100%=오른쪽/아래
  const posX = (calW - imgW) * (bgImgXPct / 100);
  const posY = (calH - imgH) * (bgImgYPct / 100);

  img.style.width   = imgW + 'px';
  img.style.height  = imgH + 'px';
  img.style.left    = posX + 'px';
  img.style.top     = posY + 'px';
  img.style.opacity = bgImgOpacityVal;
};

const removeBgImage = () => {
  bgImageDataUrl = null;
  const layer = document.getElementById('calBgImageLayer');
  if (layer) layer.style.display = 'none';
  document.getElementById('bgImageControls').style.display = 'none';
  document.getElementById('bgImageUploadArea').style.display = 'block';
  markUnsaved();
};

const loadBgImageFile = (file) => {
  if (!file) return;
  if (!bgImageDataUrl && totalImageCount() >= 5) {
    alert('이미지는 최대 5개까지 추가할 수 있습니다.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    bgImageDataUrl = e.target.result;
    // 자연 크기 파악
    const tmpImg = new Image();
    tmpImg.onload = () => {
      bgImgNaturalW = tmpImg.naturalWidth;
      bgImgNaturalH = tmpImg.naturalHeight;
      bgImgAspect = bgImgNaturalW / bgImgNaturalH;
      // 기본 100%로 초기화
      bgImgWidthPct  = 100;
      bgImgHeightPct = Math.round((100 / bgImgAspect) * 10) / 10;
      bgImgXPct = 50;
      bgImgYPct = 50;
      bgImgOpacityVal = 1.0;
      syncBgImgControls();
      document.getElementById('bgImageThumb').src = bgImageDataUrl;
      document.getElementById('bgImageUploadArea').style.display = 'none';
      document.getElementById('bgImageControls').style.display = 'block';
      applyBgImage();
      markUnsaved();
    };
    tmpImg.src = bgImageDataUrl;
  };
  reader.readAsDataURL(file);
};

const syncBgImgControls = () => {
  document.getElementById('bgImgWidth').value  = bgImgWidthPct;
  document.getElementById('bgImgHeight').value = bgImgHeightPct;
  document.getElementById('bgImgX').value = bgImgXPct;
  document.getElementById('bgImgY').value = bgImgYPct;
  document.getElementById('bgImgOpacity').value = Math.round(bgImgOpacityVal * 100);
  document.getElementById('bgImgOpacityBadge').textContent = Math.round(bgImgOpacityVal * 100) + '%';
};

// 가로/세로 비율 고정 헬퍼
const adjustHeight = (newW) => {
  if (!document.getElementById('bgImgLock').checked) return;
  return Math.round((newW / bgImgAspect) * 10) / 10;
};
const adjustWidth = (newH) => {
  if (!document.getElementById('bgImgLock').checked) return;
  return Math.round((newH * bgImgAspect) * 10) / 10;
};

// ===== 스티커 이미지 =====
let stickers = [];
let selectedStickerId = null;

const getStickerLayer = () => {
  let layer = document.getElementById('calStickerLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'calStickerLayer';
    layer.className = 'cal-sticker-layer';
    document.getElementById('previewCal').appendChild(layer);
  }
  return layer;
};

const getSelectedSticker = () => stickers.find(sticker => sticker.id === selectedStickerId);
const totalImageCount = () => stickers.length + (bgImageDataUrl ? 1 : 0);

const syncStickerEditor = () => {
  const sticker = getSelectedSticker();
  const editor = document.getElementById('stickerEditor');
  editor.style.display = sticker ? 'block' : 'none';
  if (!sticker) return;
  document.getElementById('stickerWidth').value = Math.round(sticker.width * 10) / 10;
  document.getElementById('stickerHeight').value = Math.round(sticker.height * 10) / 10;
  document.getElementById('stickerX').value = Math.round(sticker.x * 10) / 10;
  document.getElementById('stickerY').value = Math.round(sticker.y * 10) / 10;
  document.getElementById('stickerOpacity').value = Math.round(sticker.opacity * 100);
  document.getElementById('stickerOpacityBadge').textContent = `${Math.round(sticker.opacity * 100)}%`;
};

const selectSticker = (id) => {
  selectedStickerId = id;
  renderStickers();
};

const renderStickerList = () => {
  const list = document.getElementById('stickerList');
  list.innerHTML = stickers.map(sticker => `
    <button class="sticker-list-item${sticker.id === selectedStickerId ? ' selected' : ''}" data-sticker-id="${sticker.id}" type="button">
      <img src="${sticker.dataUrl}" alt="스티커">
    </button>
  `).join('');
  list.querySelectorAll('.sticker-list-item').forEach(button => {
    button.addEventListener('click', () => selectSticker(button.dataset.stickerId));
  });
};

const startStickerPointerAction = (event, sticker, mode) => {
  event.preventDefault();
  event.stopPropagation();
  selectSticker(sticker.id);
  const cal = document.getElementById('previewCal');
  const rect = cal.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const initial = { ...sticker };
  const initialW = rect.width * (initial.width / 100);
  const initialH = rect.width * (initial.height / 100);
  const freeW = Math.max(1, rect.width - initialW);
  const freeH = Math.max(1, rect.height - initialH);

  const move = (moveEvent) => {
    const pixelDx = moveEvent.clientX - startX;
    const pixelDy = moveEvent.clientY - startY;
    if (mode === 'move') {
      sticker.x = initial.x + (pixelDx / freeW) * 100;
      sticker.y = initial.y + (pixelDy / freeH) * 100;
    } else {
      sticker.width = Math.max(2, initial.width + (pixelDx / rect.width) * 100);
      sticker.height = Math.max(2, initial.height + (pixelDy / rect.width) * 100);
    }
    renderStickers();
    markUnsaved();
  };
  const end = () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', end);
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end);
};

const renderStickers = () => {
  const layer = getStickerLayer();
  layer.innerHTML = '';
  const cal = document.getElementById('previewCal');
  const calW = cal.offsetWidth;
  const calH = cal.offsetHeight;
  stickers.forEach(sticker => {
    const width = calW * (sticker.width / 100);
    const height = calW * (sticker.height / 100);
    const left = (calW - width) * (sticker.x / 100);
    const top = (calH - height) * (sticker.y / 100);
    const item = document.createElement('div');
    item.className = `cal-sticker${sticker.id === selectedStickerId ? ' selected' : ''}`;
    item.style.left = `${left}px`;
    item.style.top = `${top}px`;
    item.style.width = `${width}px`;
    item.style.height = `${height}px`;
    item.style.opacity = sticker.opacity;
    item.innerHTML = `<img src="${sticker.dataUrl}" alt=""><span class="sticker-resize-handle"></span>`;
    item.addEventListener('mousedown', event => startStickerPointerAction(event, sticker, 'move'));
    item.querySelector('.sticker-resize-handle').addEventListener('mousedown', event => startStickerPointerAction(event, sticker, 'resize'));
    layer.appendChild(item);
  });
  renderStickerList();
  syncStickerEditor();
};

const addStickerFile = (file) => {
  if (!file || totalImageCount() >= 5) return;
  const reader = new FileReader();
  reader.onload = event => {
    const image = new Image();
    image.onload = () => {
      const cal = document.getElementById('previewCal');
      const width = 20;
      const height = width / (image.naturalWidth / image.naturalHeight);
      const sticker = {
        id: `sticker-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        dataUrl: event.target.result,
        x: 50,
        y: 50,
        width,
        height,
        opacity: 1,
      };
      stickers.push(sticker);
      selectedStickerId = sticker.id;
      renderStickers();
      markUnsaved();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

document.getElementById('stickerImageInput').addEventListener('change', event => {
  const remaining = Math.max(0, 5 - totalImageCount());
  if (!remaining) alert('이미지는 최대 5개까지 추가할 수 있습니다.');
  Array.from(event.target.files).slice(0, remaining).forEach(addStickerFile);
  event.target.value = '';
});

document.getElementById('previewCal').addEventListener('mousedown', event => {
  if (event.target.closest('.cal-sticker')) return;
  selectedStickerId = null;
  renderStickers();
});

['Width', 'Height', 'X', 'Y'].forEach(key => {
  document.getElementById(`sticker${key}`).addEventListener('input', event => {
    const sticker = getSelectedSticker();
    if (!sticker) return;
    sticker[key.toLowerCase()] = Number(event.target.value);
    renderStickers();
    markUnsaved();
  });
});

document.getElementById('stickerOpacity').addEventListener('input', event => {
  const sticker = getSelectedSticker();
  if (!sticker) return;
  sticker.opacity = Number(event.target.value) / 100;
  renderStickers();
  markUnsaved();
});

document.getElementById('stickerDelete').addEventListener('click', () => {
  stickers = stickers.filter(sticker => sticker.id !== selectedStickerId);
  selectedStickerId = null;
  renderStickers();
  markUnsaved();
});

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
    el.style.color = alphaColor(fontColors.week, fontOpacities.week);
  });
  cal.querySelectorAll('.p-num.blue').forEach(el => { el.style.color = alphaColor(fontColors.sat, fontOpacities.sat); });
  cal.querySelectorAll('.p-num.red, .p-holiday').forEach(el => { el.style.color = alphaColor(fontColors.sun, fontOpacities.sun); });
};

const applyTitleColor = () => {
  document.querySelector('.cal-title').style.color = alphaColor(fontColors.title, fontOpacities.title);
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
  cal.style.background = alphaColor(hex, currentBgOpacity);
  document.getElementById('dot-bg').style.background = hex;

  document.querySelectorAll('.bg-options .deco-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.bg === hex);
  });
};

const applyDefaultCellColor = (hex) => {
  defaultCellColor = hex;
  document.getElementById('previewCal').style.setProperty('--default-cell-color', alphaColor(hex, defaultCellOpacity));
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

const setOpacitySlider = (id, opacity) => {
  const slider = document.getElementById(id);
  const badge = document.getElementById(`${id}Badge`);
  if (!slider) return;
  const value = Math.round(opacity * 100);
  slider.value = value;
  if (badge) badge.textContent = `${value}%`;
};

const setupOpacityControls = () => {
  addOpacityControl('bgHexInput', 'bgOpacity', 100, opacity => {
    currentBgOpacity = opacity;
    applyBg(currentBg);
  });
  addOpacityControl('defaultCellHexInput', 'defaultCellOpacity', 100, opacity => {
    defaultCellOpacity = opacity;
    applyDefaultCellColor(defaultCellColor);
  });

  ['title', 'week', 'sat', 'sun'].forEach(key => {
    addOpacityControl(`fontHex-${key}`, `fontOpacity-${key}`, 100, opacity => {
      fontOpacities[key] = opacity;
      applyFontColors();
      applyTitleColor();
    });
  });

  ['week', 'sat', 'sun'].forEach(key => {
    addOpacityControl(`headHex-${key}`, `headOpacity-${key}`, 100, opacity => {
      headOpacities[key] = opacity;
      applyHeadColors();
    });
    addOpacityControl(`headFontHex-${key}`, `headFontOpacity-${key}`, 100, opacity => {
      headFontOpacities[key] = opacity;
      applyHeadFontColors();
    });
  });
};

const syncThemePickers = () => {
  bgPicker.syncTo(currentBg);
  defaultCellPicker.syncTo(defaultCellColor);
  otherPicker.syncTo(otherCellColor);
  highlightPicker.syncTo(highlightColor);
  ['title', 'week', 'sat', 'sun'].forEach(key => fontPickers[key].syncTo(fontColors[key]));
};

const applyTheme = (theme) => {
  currentBgOpacity = theme.bgOpacity ?? 1;
  defaultCellOpacity = theme.defaultCellOpacity ?? 1;
  setOpacitySlider('bgOpacity', currentBgOpacity);
  setOpacitySlider('defaultCellOpacity', defaultCellOpacity);
  applyBg(theme.bg);
  applyDefaultCellColor(theme.defaultCell);
  applyOtherColor(theme.otherCell);
  applyOtherOpacity(theme.otherOpacity * 100);
  applyHighlightColor(theme.highlight);
  applyHighlightOpacity(theme.highlightOpacity * 100);
  ['title', 'week', 'sat', 'sun'].forEach(key => {
    fontOpacities[key] = theme.fontOpacities?.[key] ?? 1;
    setOpacitySlider(`fontOpacity-${key}`, fontOpacities[key]);
    setFontColor(key, theme.fonts[key]);
  });
  ['week', 'sat', 'sun'].forEach(key => {
    headOpacities[key] = theme.headOpacities?.[key] ?? 1;
    headFontOpacities[key] = theme.headFontOpacities?.[key] ?? 1;
    setOpacitySlider(`headOpacity-${key}`, headOpacities[key]);
    setOpacitySlider(`headFontOpacity-${key}`, headFontOpacities[key]);
  });
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
    if (!key) return;
    const def = '#' + btn.dataset.default;
    if (key.startsWith('headfont-')) {
      const sub = key.replace('headfont-', '');
      headFontColors[sub] = def;
      headFontOpacities[sub] = 1;
      setOpacitySlider(`headFontOpacity-${sub}`, headFontOpacities[sub]);
      headFontPickers[sub].syncTo(def);
      document.getElementById(`dot-headfont-${sub}`).style.background = def;
      applyHeadFontColors();
      return;
    }
    if (key.startsWith('head-')) {
      const sub = key.replace('head-', '');
      headColors[sub] = def;
      headOpacities[sub] = 1;
      setOpacitySlider(`headOpacity-${sub}`, headOpacities[sub]);
      headPickers[sub].syncTo(def);
      document.getElementById(`dot-head-${sub}`).style.background = def;
      applyHeadColors();
      return;
    }

    if (key === 'defaultCell') {
      defaultCellOpacity = 1;
      setOpacitySlider('defaultCellOpacity', defaultCellOpacity);
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

    if (fontOpacities[key] !== undefined) {
      fontOpacities[key] = 1;
      setOpacitySlider(`fontOpacity-${key}`, fontOpacities[key]);
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
const applySelectedFont = (fontFamily) => {
  markUnsaved();
  document.getElementById('fontFamily').value = fontFamily;
  const cal = document.getElementById('previewCal');
  cal.style.fontFamily = fontFamily;
  cal.querySelectorAll('*').forEach(el => el.style.fontFamily = 'inherit');
};

document.getElementById('fontFamily').addEventListener('change', event => {
  applySelectedFont(event.target.value);
});

// ===== 요일 헤더 색상 =====
const HEAD_DEFAULTS = { week: '#333333', sat: '#1b6ae3', sun: '#e31b20' };
const headColors = { week: '#333333', sat: '#1b6ae3', sun: '#e31b20' };

const applyHeadColors = () => {
  const cal = document.getElementById('previewCal');
  // 평일 헤더 (sun, sat 제외)
  cal.style.setProperty('--head-week-color', alphaColor(headColors.week, headOpacities.week));
  cal.style.setProperty('--head-sat-color',  alphaColor(headColors.sat, headOpacities.sat));
  cal.style.setProperty('--head-sun-color',  alphaColor(headColors.sun, headOpacities.sun));
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
  cal.style.setProperty('--head-font-week-color', alphaColor(headFontColors.week, headFontOpacities.week));
  cal.style.setProperty('--head-font-sat-color',  alphaColor(headFontColors.sat, headFontOpacities.sat));
  cal.style.setProperty('--head-font-sun-color',  alphaColor(headFontColors.sun, headFontOpacities.sun));
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
  savedAt: Date.now(),
  imageLayoutVersion: 2,
  font:     document.getElementById('fontFamily').value,
  bg:       currentBg,
  bgOpacity: currentBgOpacity,
  fontColors:     { ...fontColors },
  fontOpacities:  { ...fontOpacities },
  defaultCell:    defaultCellColor,
  defaultCellOpacity,
  otherCell:      otherCellColor,
  otherOpacity,
  highlightColor,
  highlightOpacity,
  headColors:     { ...headColors },
  headOpacities:  { ...headOpacities },
  headFontColors: { ...headFontColors },
  headFontOpacities: { ...headFontOpacities },
  bgImage: bgImageDataUrl ? {
    dataUrl:  bgImageDataUrl,
    widthPct: bgImgWidthPct,
    heightPct: bgImgHeightPct,
    xPct:     bgImgXPct,
    yPct:     bgImgYPct,
    opacity:  bgImgOpacityVal,
  } : null,
  stickers: stickers.map(sticker => ({ ...sticker })),
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
  const cal = document.getElementById('previewCal');
  const legacyLayout = theme.imageLayoutVersion !== 2;
  const legacyHeightToWidth = value => value * (cal.offsetHeight / cal.offsetWidth);
  const migrateLegacySticker = sticker => {
    if (!legacyLayout) return { ...sticker };
    const widthPx = cal.offsetWidth * ((sticker.width ?? 20) / 100);
    const heightPx = cal.offsetHeight * ((sticker.height ?? 20) / 100);
    const freeW = Math.max(1, cal.offsetWidth - widthPx);
    const freeH = Math.max(1, cal.offsetHeight - heightPx);
    return {
      ...sticker,
      x: (cal.offsetWidth * ((sticker.x ?? 40) / 100) / freeW) * 100,
      y: (cal.offsetHeight * ((sticker.y ?? 40) / 100) / freeH) * 100,
      height: legacyHeightToWidth(sticker.height ?? 20),
    };
  };
  const loaded = {
    bg: theme.bg || LIGHT_THEME.bg,
    bgOpacity: theme.bgOpacity ?? LIGHT_THEME.bgOpacity,
    defaultCell: theme.defaultCell || LIGHT_THEME.defaultCell,
    defaultCellOpacity: theme.defaultCellOpacity ?? LIGHT_THEME.defaultCellOpacity,
    otherCell: theme.otherCell || LIGHT_THEME.otherCell,
    otherOpacity: theme.otherOpacity ?? LIGHT_THEME.otherOpacity,
    highlightColor: theme.highlightColor || LIGHT_THEME.highlight,
    highlightOpacity: theme.highlightOpacity ?? LIGHT_THEME.highlightOpacity,
    fontColors: { ...FONT_DEFAULTS, ...(theme.fontColors || {}) },
    fontOpacities: { ...LIGHT_THEME.fontOpacities, ...(theme.fontOpacities || {}) },
    headColors: theme.headColors || HEAD_DEFAULTS,
    headOpacities: { ...LIGHT_THEME.headOpacities, ...(theme.headOpacities || {}) },
    headFontColors: theme.headFontColors || HEAD_FONT_DEFAULTS,
    headFontOpacities: { ...LIGHT_THEME.headFontOpacities, ...(theme.headFontOpacities || {}) },
  };

  if (theme.font) {
    const fontSelect = document.getElementById('fontFamily');
    const exists = Array.from(fontSelect.options).some(option => option.value === theme.font);
    fontSelect.value = exists ? theme.font : fontSelect.options[0].value;
    const cal = document.getElementById('previewCal');
    cal.style.fontFamily = fontSelect.value;
    cal.querySelectorAll('*').forEach(el => el.style.fontFamily = 'inherit');
  }

  currentBgOpacity = loaded.bgOpacity;
  applyBg(loaded.bg);
  bgPicker.syncTo(loaded.bg);
  setOpacitySlider('bgOpacity', currentBgOpacity);

  defaultCellOpacity = loaded.defaultCellOpacity;
  applyDefaultCellColor(loaded.defaultCell);
  defaultCellPicker.syncTo(loaded.defaultCell);
  setOpacitySlider('defaultCellOpacity', defaultCellOpacity);

  applyOtherColor(loaded.otherCell);
  otherPicker.syncTo(loaded.otherCell);
  applyOtherOpacity(loaded.otherOpacity * 100);

  applyHighlightColor(loaded.highlightColor);
  highlightPicker.syncTo(loaded.highlightColor);
  applyHighlightOpacity(loaded.highlightOpacity * 100);
  ['title', 'week', 'sat', 'sun'].forEach(key => {
    fontOpacities[key] = loaded.fontOpacities[key] ?? 1;
    setOpacitySlider(`fontOpacity-${key}`, fontOpacities[key]);
    setFontColor(key, loaded.fontColors[key] || FONT_DEFAULTS[key]);
    if (key !== 'title') {
      headOpacities[key] = loaded.headOpacities[key] ?? 1;
      headFontOpacities[key] = loaded.headFontOpacities[key] ?? 1;
      setOpacitySlider(`headOpacity-${key}`, headOpacities[key]);
      setOpacitySlider(`headFontOpacity-${key}`, headFontOpacities[key]);
      setHeadColor(key, loaded.headColors[key] || HEAD_DEFAULTS[key]);
      setHeadFontColor(key, loaded.headFontColors[key] || HEAD_FONT_DEFAULTS[key]);
    }
  });

  applyFontColors();
  applyHeadColors();
  applyHeadFontColors();
  applyTitleColor();

  // 배경 이미지 복원
  if (theme.bgImage && theme.bgImage.dataUrl) {
    bgImageDataUrl = theme.bgImage.dataUrl;
    bgImgWidthPct  = theme.bgImage.widthPct  ?? 100;
    bgImgHeightPct = legacyLayout
      ? legacyHeightToWidth(theme.bgImage.heightPct ?? 100)
      : theme.bgImage.heightPct ?? 100;
    bgImgXPct      = theme.bgImage.xPct      ?? 50;
    bgImgYPct      = theme.bgImage.yPct      ?? 50;
    bgImgOpacityVal = theme.bgImage.opacity  ?? 1;

    const tmpImg = new Image();
    tmpImg.onload = () => {
      bgImgNaturalW = tmpImg.naturalWidth;
      bgImgNaturalH = tmpImg.naturalHeight;
      bgImgAspect   = bgImgNaturalW / bgImgNaturalH;
    };
    tmpImg.src = bgImageDataUrl;

    document.getElementById('bgImageThumb').src = bgImageDataUrl;
    document.getElementById('bgImageUploadArea').style.display = 'none';
    document.getElementById('bgImageControls').style.display = 'block';
    syncBgImgControls();
    applyBgImage();
  } else {
    removeBgImage();
  }

  stickers = Array.isArray(theme.stickers)
    ? theme.stickers.slice(0, theme.bgImage ? 4 : 5).map(migrateLegacySticker)
    : [];
  selectedStickerId = null;
  renderStickers();

  isSaved = true;
};

document.getElementById('btnDecoSave').addEventListener('click', async () => {
  const yes = await showConfirm('스타일을 불러오시겠습니까?');
  if (!yes) return;

  let theme;
  try {
    theme = await loadFullTheme();
  } catch (error) {
    console.error('스타일 불러오기 오류:', error);
  }
  if (!theme) {
    const raw = localStorage.getItem('calendarTheme');
    if (raw) theme = JSON.parse(raw);
  }
  if (!theme) {
    alert('인덱스에 적용된 스타일이 없습니다.');
    return;
  }

  try {
    loadThemeIntoEditor(theme);
  } catch (e) {
    alert('스타일을 불러오지 못했습니다.');
  }
});

document.getElementById('btnDecoApply').addEventListener('click', async () => {
  const button = document.getElementById('btnDecoApply');
  button.disabled = true;
  const theme = buildTheme();
  try {
    if (hasFileAssets(theme)) {
      try {
        await saveFullTheme(theme);
        localStorage.setItem('calendarTheme', JSON.stringify(makeLightTheme(theme)));
      } catch (assetError) {
        console.warn('파일 저장소 저장 실패, localStorage 전체 저장 시도:', assetError);
        localStorage.setItem('calendarTheme', JSON.stringify(theme));
      }
    } else {
      localStorage.setItem('calendarTheme', JSON.stringify(makeLightTheme(theme)));
      try {
        await deleteFullTheme();
      } catch (error) {
        console.warn('이전 파일 스타일 삭제 생략:', error);
      }
    }
    isSaved = true;
    window.widgetApi?.themeApplied();
    alert('적용되었습니다!');
    location.href = 'index.html';
  } catch (error) {
    console.error('스타일 적용 오류:', error);
    alert(`스타일을 저장하지 못했습니다: ${error?.name || '저장소 오류'}`);
    button.disabled = false;
  }
});
// ===== 배경 이미지 이벤트 =====
document.getElementById('bgImageInput').addEventListener('change', e => {
  loadBgImageFile(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('bgImageChange').addEventListener('change', e => {
  loadBgImageFile(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('bgImageRemove').addEventListener('click', removeBgImage);

// 너비 조절
const setupImgSizeBtn = (inputId, upId, downId, onInput) => {
  const input = document.getElementById(inputId);
  input.addEventListener('input', () => { onInput(Number(input.value)); markUnsaved(); });
  document.getElementById(upId).addEventListener('click', () => {
    input.value = Number(input.value) + 1;
    onInput(Number(input.value)); markUnsaved();
  });
  document.getElementById(downId).addEventListener('click', () => {
    input.value = Number(input.value) - 1;
    onInput(Number(input.value)); markUnsaved();
  });
};

setupImgSizeBtn('bgImgWidth', 'bgImgWidthUp', 'bgImgWidthDown', (v) => {
  bgImgWidthPct = v;
  const locked = adjustHeight(v);
  if (locked !== undefined) {
    bgImgHeightPct = locked;
    document.getElementById('bgImgHeight').value = locked;
  }
  applyBgImage();
});

setupImgSizeBtn('bgImgHeight', 'bgImgHeightUp', 'bgImgHeightDown', (v) => {
  bgImgHeightPct = v;
  const locked = adjustWidth(v);
  if (locked !== undefined) {
    bgImgWidthPct = locked;
    document.getElementById('bgImgWidth').value = locked;
  }
  applyBgImage();
});

setupImgSizeBtn('bgImgX', 'bgImgXUp', 'bgImgXDown', (v) => {
  bgImgXPct = v; applyBgImage();
});
setupImgSizeBtn('bgImgY', 'bgImgYUp', 'bgImgYDown', (v) => {
  bgImgYPct = v; applyBgImage();
});

document.getElementById('bgImgOpacity').addEventListener('input', e => {
  bgImgOpacityVal = Number(e.target.value) / 100;
  document.getElementById('bgImgOpacityBadge').textContent = e.target.value + '%';
  applyBgImage();
  markUnsaved();
});

// ===== 나가기 =====
document.getElementById('btnDecoExit').addEventListener('click', () => {
  location.href = 'index.html';
});

// ===== 초기화 (항상 기본값으로 시작) =====
window.onload = () => {
  isSaved = true;
  setupOpacityControls();
  renderStickers();
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
    fontOpacities[key] = LIGHT_THEME.fontOpacities[key];
    setOpacitySlider(`fontOpacity-${key}`, fontOpacities[key]);
    fontPickers[key].syncTo(FONT_DEFAULTS[key]);
    document.getElementById(`dot-${key}`).style.background = FONT_DEFAULTS[key];
  });
  applyFontColors();
  applyTitleColor();

  ['week', 'sat', 'sun'].forEach(key => {
    headColors[key] = HEAD_DEFAULTS[key];
    headOpacities[key] = LIGHT_THEME.headOpacities[key];
    setOpacitySlider(`headOpacity-${key}`, headOpacities[key]);
    headPickers[key].syncTo(HEAD_DEFAULTS[key]);
    document.getElementById(`dot-head-${key}`).style.background = HEAD_DEFAULTS[key];
  });
  applyHeadColors();

  ['week', 'sat', 'sun'].forEach(key => {
    headFontColors[key] = HEAD_FONT_DEFAULTS[key];
    headFontOpacities[key] = LIGHT_THEME.headFontOpacities[key];
    setOpacitySlider(`headFontOpacity-${key}`, headFontOpacities[key]);
    headFontPickers[key].syncTo(HEAD_FONT_DEFAULTS[key]);
    document.getElementById(`dot-headfont-${key}`).style.background = HEAD_FONT_DEFAULTS[key];
  });
  applyHeadFontColors();
};
