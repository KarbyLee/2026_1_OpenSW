// 공공데이터포털 일반 인증키
const SERVICE_KEY = '7d3e97e35d4372badd887c4c6d7bfaa7d66ad258a95d45f76079d007b0380974';
const API_URL = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

let date = new Date();
let selectedDateKey = null;

const THEME_DB_NAME = 'prettyCalendarAssetsV3';
const THEME_STORE_NAME = 'themes';
const loadFullTheme = () => new Promise((resolve) => {
  const request = indexedDB.open(THEME_DB_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(THEME_STORE_NAME)) {
      request.result.createObjectStore(THEME_STORE_NAME);
    }
  };
  request.onerror = () => resolve(null);
  request.onsuccess = () => {
    const db = request.result;
    const getRequest = db.transaction(THEME_STORE_NAME, 'readonly').objectStore(THEME_STORE_NAME).get('calendarTheme');
    getRequest.onsuccess = () => {
      resolve(getRequest.result || null);
      db.close();
    };
    getRequest.onerror = () => {
      resolve(null);
      db.close();
    };
  };
});

// 연도별 공휴일 캐시 { 2025: { 'YYYY-MM-DD': '공휴일명', ... } }
const holidayCache = {};

const getMemos = () => JSON.parse(localStorage.getItem('calendarMemos') || '{}');
const saveMemos = (memos) => localStorage.setItem('calendarMemos', JSON.stringify(memos));

const makeDateKey = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${opacity})`;
};

const getAppliedTheme = () => {
  let theme = {};
  try { theme = JSON.parse(localStorage.getItem('calendarTheme') || '{}'); }
  catch { theme = {}; }

  // 예전 저장 키가 남아 있어도 이전/다음 달 칸은 반드시 따라오게 보정
  theme.otherCell = theme.otherCell || localStorage.getItem('decoOtherColor') || '#969696';
  theme.otherOpacity = theme.otherOpacity ?? Number(localStorage.getItem('decoOtherOpacity') || 0.3);

  return theme;
};

// 연도 단위로 공휴일 전체 fetch (예시 코드 방식 그대로)
const fetchHolidaysByYear = async (year) => {
  if (holidayCache[year]) return holidayCache[year];

  const params = new URLSearchParams({
    ServiceKey: SERVICE_KEY,
    solYear: year,
    numOfRows: 100,
    _type: 'json',
  });

  try {
    const res = await fetch(`${API_URL}?${params}`);
    const json = await res.json();
    const items = json?.response?.body?.items?.item;

    const result = {};

    if (items) {
      const list = Array.isArray(items) ? items : [items];
      list.forEach(item => {
        if (item.isHoliday === 'Y') {
          const loc = String(item.locdate); // YYYYMMDD
          const key = `${loc.slice(0,4)}-${loc.slice(4,6)}-${loc.slice(6,8)}`;
          result[key] = item.dateName;
        }
      });
    }

    holidayCache[year] = result;
    return result;
  } catch (e) {
    console.error('공휴일 API 오류:', e);
    holidayCache[year] = {};
    return {};
  }
};

const makeCalendar = async (targetDate) => {
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth() + 1;

  // 연도 단위 fetch (캐시 있으면 재사용)
  const holidays = await fetchHolidaysByYear(currentYear);

  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const lastDay  = new Date(currentYear, currentMonth, 0).getDate();
  const limitDay = firstDay + lastDay;
  const nextDay  = Math.ceil(limitDay / 7) * 7;

  const memos = getMemos();

  // 오늘 날짜
  const today = new Date();
  const todayKey = makeDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  let html = '';
  const appliedTheme = getAppliedTheme();
  const hasOtherTheme = appliedTheme.otherCell && appliedTheme.otherOpacity !== undefined;
  const otherOpacity = hasOtherTheme ? Number(appliedTheme.otherOpacity) : 0.3;
  const otherColor = hasOtherTheme ? appliedTheme.otherCell : '#969696';
  const otherCellStyle = '';
  const otherNumStyle = ` style="color:${otherColor};opacity:${otherOpacity}"`;

  // 이전 달 칸
  const prevLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const prevDay = prevLastDay - (firstDay - 1 - i);
    html += `<div class="noColor"${otherCellStyle}><span class="noColor-num"${otherNumStyle}>${prevDay}</span></div>`;
  }

  // 이번 달 날짜
  for (let i = 1; i <= lastDay; i++) {
    const dayOfWeek = (firstDay + i - 1) % 7;
    const dateKey   = makeDateKey(currentYear, currentMonth, i);
    const memo      = memos[dateKey] || '';
    const holidayName = holidays[dateKey] || null;
    const isToday   = dateKey === todayKey;

    let colorClass = '';
    let badgeHtml  = '';

    if (holidayName) {
      colorClass = ' sunday';
      const isSubstitute = holidayName === '대체공휴일';
      badgeHtml = `<span class="holiday-name${isSubstitute ? ' substitute' : ''}">${holidayName}</span>`;
    } else if (dayOfWeek === 0) {
      colorClass = ' sunday';
    } else if (dayOfWeek === 6) {
      colorClass = ' saturday';
    }

    if (isToday) colorClass += ' today';

    const memoHtml = memo ? `<span class="memo-preview">${memo}</span>` : '';

    html += `<div class="day-cell${colorClass}"
      data-key="${dateKey}"
      data-day="${i}"
      data-year="${currentYear}"
      data-month="${currentMonth}"
      data-holiday="${holidayName || ''}">
      <div class="day-top">
        <span class="day-num${isToday ? ' today-num' : ''}">${i}</span>
        ${badgeHtml}
      </div>
      ${memoHtml}
    </div>`;
  }

  // 다음 달 칸
  let nextMonthDay = 1;
  for (let i = limitDay; i < nextDay; i++) {
    html += `<div class="noColor"${otherCellStyle}><span class="noColor-num"${otherNumStyle}>${nextMonthDay++}</span></div>`;
  }

  document.querySelector('.dateBoard').innerHTML = html;
  document.querySelector('.dateTitle').innerText = `${currentYear}년 ${currentMonth}월`;

  document.querySelectorAll('.day-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      openModal(cell.dataset.key, cell.dataset.year, cell.dataset.month, cell.dataset.day, cell.dataset.holiday);
    });
  });
};

// 모달 열기
const openModal = (dateKey, year, month, day, holiday = '') => {
  selectedDateKey = dateKey;
  const memos = getMemos();

  const dateEl = document.getElementById('modalDate');
  dateEl.innerHTML = `${year}년 ${month}월 ${day}일${
    holiday ? ` <span class="modal-holiday">${holiday}</span>` : ''
  }`;

  document.getElementById('memoInput').value = memos[dateKey] || '';
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('memoInput').focus();
};

// 모달 닫기
const closeModal = () => {
  document.getElementById('modalOverlay').classList.remove('active');
  selectedDateKey = null;
};

document.getElementById('btnSave').onclick = () => {
  if (!selectedDateKey) return;
  const memos = getMemos();
  const text = document.getElementById('memoInput').value.trim();
  if (text) memos[selectedDateKey] = text;
  else delete memos[selectedDateKey];
  saveMemos(memos);
  closeModal();
  makeCalendar(date);
};

document.getElementById('btnDelete').onclick = () => {
  if (!selectedDateKey) return;
  const memos = getMemos();
  delete memos[selectedDateKey];
  saveMemos(memos);
  closeModal();
  makeCalendar(date);
};

document.getElementById('modalClose').onclick = closeModal;

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ===== 테마 적용 =====
const applyTheme = async () => {
  const raw = localStorage.getItem('calendarTheme');
  const fullTheme = await loadFullTheme();
  if (!raw && !fullTheme) return;
  try {
    const lightTheme = raw ? JSON.parse(raw) : null;
    const t = fullTheme && (!lightTheme || (fullTheme.savedAt ?? 0) >= (lightTheme.savedAt ?? 0))
      ? fullTheme
      : lightTheme;
    const root = document.querySelector('.rap');
    if (!root) return;

    if (t.imageLayoutVersion !== 2) {
      const rootW = root.offsetWidth;
      const rootH = root.offsetHeight;
      if (t.bgImage) {
        t.bgImage.heightPct = (t.bgImage.heightPct ?? 100) * (rootH / rootW);
      }
      if (Array.isArray(t.stickers)) {
        t.stickers = t.stickers.map(sticker => {
          const width = rootW * ((sticker.width ?? 20) / 100);
          const height = rootH * ((sticker.height ?? 20) / 100);
          return {
            ...sticker,
            x: (rootW * ((sticker.x ?? 40) / 100) / Math.max(1, rootW - width)) * 100,
            y: (rootH * ((sticker.y ?? 40) / 100) / Math.max(1, rootH - height)) * 100,
            height: (sticker.height ?? 20) * (rootH / rootW),
          };
        });
      }
      t.imageLayoutVersion = 2;
      localStorage.setItem('calendarTheme', JSON.stringify({
        ...t,
        bgImage: t.bgImage ? { ...t.bgImage, dataUrl: '' } : null,
        stickers: [],
      }));
    }

    if (t.font) {
      root.style.setProperty('--cal-font', t.font);
      root.style.fontFamily = t.font; // 직접도 적용
    }
    if (t.bg) {
      const calendarBackground = hexToRgba(t.bg, t.bgOpacity ?? 1);
      root.style.setProperty('--cal-bg', calendarBackground);
      document.documentElement.style.setProperty('--widget-bg', calendarBackground);
    }

    if (t.fontColors) {
      root.style.setProperty('--font-week-color', hexToRgba(t.fontColors.week || '#222222', t.fontOpacities?.week ?? 1));
      root.style.setProperty('--font-sat-color',  hexToRgba(t.fontColors.sat  || '#1b6ae3', t.fontOpacities?.sat ?? 1));
      root.style.setProperty('--font-sun-color',  hexToRgba(t.fontColors.sun  || '#e31b20', t.fontOpacities?.sun ?? 1));
      root.style.setProperty('--title-color',     hexToRgba(t.fontColors.title || t.fontColors.week || '#222222', t.fontOpacities?.title ?? t.fontOpacities?.week ?? 1));
    }

    if (t.defaultCell) root.style.setProperty('--cell-bg', hexToRgba(t.defaultCell, t.defaultCellOpacity ?? 1));

    if (t.otherCell && t.otherOpacity !== undefined) {
      const r = parseInt(t.otherCell.slice(1,3),16);
      const g = parseInt(t.otherCell.slice(3,5),16);
      const b = parseInt(t.otherCell.slice(5,7),16);
      const otherRgba = `rgba(${r},${g},${b},${t.otherOpacity})`;
      root.style.setProperty('--other-cell-bg', otherRgba);
      root.style.setProperty('--other-number-color', t.otherCell);
      root.style.setProperty('--other-number-opacity', t.otherOpacity);
      root.style.setProperty('--other-overlay-color', 'transparent');
    }

    if (t.highlightColor && t.highlightOpacity !== undefined) {
      const r = parseInt(t.highlightColor.slice(1,3),16);
      const g = parseInt(t.highlightColor.slice(3,5),16);
      const b = parseInt(t.highlightColor.slice(5,7),16);
      const op  = t.highlightOpacity;
      const opB = Math.min(1, op + 0.22);
      root.style.setProperty('--today-bg',           `rgba(${r},${g},${b},${op})`);
      root.style.setProperty('--today-bg-hover',     `rgba(${r},${g},${b},${Math.min(1,op+0.05)})`);
      root.style.setProperty('--today-border',       `rgba(${r},${g},${b},${opB})`);
      root.style.setProperty('--today-border-hover', `rgba(${r},${g},${b},${Math.min(1,opB+0.1)})`);
      root.style.setProperty('--today-num-bg',       `rgba(${r},${g},${b},${op})`);
    }

    if (t.headColors) {
      root.style.setProperty('--head-week-bg',  hexToRgba(t.headColors.week || '#333333', t.headOpacities?.week ?? 1));
      root.style.setProperty('--head-sat-bg',   hexToRgba(t.headColors.sat  || '#1b6ae3', t.headOpacities?.sat ?? 1));
      root.style.setProperty('--head-sun-bg',   hexToRgba(t.headColors.sun  || '#e31b20', t.headOpacities?.sun ?? 1));
    }

    if (t.headFontColors) {
      root.style.setProperty('--head-week-font', hexToRgba(t.headFontColors.week || '#ffffff', t.headFontOpacities?.week ?? 1));
      root.style.setProperty('--head-sat-font',  hexToRgba(t.headFontColors.sat  || '#ffffff', t.headFontOpacities?.sat ?? 1));
      root.style.setProperty('--head-sun-font',  hexToRgba(t.headFontColors.sun  || '#ffffff', t.headFontOpacities?.sun ?? 1));
    }
    if (t.bgImage && t.bgImage.dataUrl) {
      const rap = document.querySelector('.rap');
      if (rap) {
        let bgLayer = document.getElementById('calBgImageLayer');
        if (!bgLayer) {
          bgLayer = document.createElement('div');
          bgLayer.id = 'calBgImageLayer';
          bgLayer.innerHTML = '<img id="calBgImg" style="position:absolute;transform-origin:top left;" src="" alt="">';
          rap.style.position = 'relative';
          rap.insertBefore(bgLayer, rap.firstChild);
        }

        bgLayer.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;border-radius:0;';
        rap.querySelectorAll('.header, .dateHead, .dateBoard').forEach(el => {
          el.style.position = 'relative';
          el.style.zIndex   = '1';
        });

        const img = bgLayer.querySelector('img');
        const {
          dataUrl,
          widthPct=100,
          heightPct=100,
          xPct=50,
          yPct=50,
          opacity=1,
        } = t.bgImage;
        const layoutBgImage = () => {
          const rapW = rap.offsetWidth, rapH = rap.offsetHeight;
          const imgW = rapW * (widthPct / 100);
          const imgH = t.imageLayoutVersion === 2
            ? rapW * (heightPct / 100)
            : rapH * (heightPct / 100);
          const posX = (rapW - imgW) * (xPct / 100);
          const posY = (rapH - imgH) * (yPct / 100);
          img.style.width   = imgW + 'px';
          img.style.height  = imgH + 'px';
          img.style.left    = posX + 'px';
          img.style.top     = posY + 'px';
          img.style.opacity = opacity;
        };
        img.onload = layoutBgImage;
        img.src = dataUrl;
        if (img.complete) layoutBgImage();
        requestAnimationFrame(layoutBgImage);
        bgLayer.style.display = 'block';
      }
    } else {
      const bgLayer = document.getElementById('calBgImageLayer');
      if (bgLayer) bgLayer.style.display = 'none';
    }

    let stickerLayer = document.getElementById('calStickerLayer');
    if (!stickerLayer) {
      stickerLayer = document.createElement('div');
      stickerLayer.id = 'calStickerLayer';
      root.appendChild(stickerLayer);
    }
    stickerLayer.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden;border-radius:0;';
    stickerLayer.innerHTML = '';
    (Array.isArray(t.stickers) ? t.stickers : []).slice(0, t.bgImage ? 4 : 5).forEach(sticker => {
      const rootW = root.offsetWidth;
      const rootH = root.offsetHeight;
      const width = rootW * ((sticker.width ?? 20) / 100);
      const height = t.imageLayoutVersion === 2
        ? rootW * ((sticker.height ?? 20) / 100)
        : rootH * ((sticker.height ?? 20) / 100);
      const left = t.imageLayoutVersion === 2
        ? (rootW - width) * ((sticker.x ?? 50) / 100)
        : rootW * ((sticker.x ?? 40) / 100);
      const top = t.imageLayoutVersion === 2
        ? (rootH - height) * ((sticker.y ?? 50) / 100)
        : rootH * ((sticker.y ?? 40) / 100);
      const item = document.createElement('img');
      item.src = sticker.dataUrl;
      item.alt = '';
      item.style.cssText = [
        'position:absolute',
        `left:${left}px`,
        `top:${top}px`,
        `width:${width}px`,
        `height:${height}px`,
        `opacity:${sticker.opacity ?? 1}`,
        'object-fit:fill',
      ].join(';');
      stickerLayer.appendChild(item);
    });
  } catch(e) { console.error('테마 적용 오류:', e); }
};

const isHexDark = (hex) => {
  const r=parseInt(hex.slice(1,3),16),
        g=parseInt(hex.slice(3,5),16),
        b=parseInt(hex.slice(5,7),16);
  return (r*0.299+g*0.587+b*0.114) < 128;
};

let themeResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(themeResizeTimer);
  themeResizeTimer = setTimeout(() => applyTheme(), 60);
});

window.onload = async () => {
  await makeCalendar(date);
  await applyTheme();
};

document.querySelector('.prevDay').onclick = async () => {
  date.setMonth(date.getMonth() - 1);
  await makeCalendar(new Date(date));
  await applyTheme();
};

document.querySelector('.nextDay').onclick = async () => {
  date.setMonth(date.getMonth() + 1);
  await makeCalendar(new Date(date));
  await applyTheme();
};
const isWidgetMode = window.widgetApi?.mode === 'widget';
document.body.classList.add(isWidgetMode ? 'widget-mode' : 'app-mode');

if (isWidgetMode) {
  let dragPointerId = null;
  let lastScreenX = 0;
  let lastScreenY = 0;
  let dragDistance = 0;
  let didDrag = false;

  const isWidgetControl = (target) => target.closest(
    'button, textarea, input, select, .modal, .modal-overlay.active'
  );
  const dragSurfaces = document.querySelectorAll('.rap, .widget-statusbar');

  const optionButton = document.getElementById('widgetOptionButton');
  const optionMenu = document.getElementById('widgetOptionMenu');

  optionButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    optionMenu?.classList.toggle('open');
  });

  document.getElementById('widgetDeleteButton')?.addEventListener('click', () => {
    window.widgetApi?.removeWidget();
  });

  document.getElementById('widgetOpenApp')?.addEventListener('click', () => {
    optionMenu?.classList.remove('open');
    window.widgetApi?.openApp();
  });

  document.querySelectorAll('[data-widget-size]').forEach(button => {
    button.addEventListener('click', () => {
      optionMenu?.classList.remove('open');
      window.widgetApi?.setSizePreset(button.dataset.widgetSize);
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.widget-option-wrap')) optionMenu?.classList.remove('open');
  });

  dragSurfaces.forEach(surface => {
    surface.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || isWidgetControl(event.target)) return;

      dragPointerId = event.pointerId;
      lastScreenX = event.screenX;
      lastScreenY = event.screenY;
      dragDistance = 0;
      didDrag = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    });

    surface.addEventListener('pointermove', (event) => {
      if (event.pointerId !== dragPointerId) return;

      const deltaX = event.screenX - lastScreenX;
      const deltaY = event.screenY - lastScreenY;
      lastScreenX = event.screenX;
      lastScreenY = event.screenY;
      dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

      if (dragDistance < 7) return;
      didDrag = true;
      document.body.classList.add('widget-dragging');
      window.widgetApi?.moveBy(deltaX, deltaY);
    });
  });

  const finishWidgetDrag = (event) => {
    if (event.pointerId !== dragPointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragPointerId = null;
    document.body.classList.remove('widget-dragging');
    if (didDrag) window.widgetApi?.finishMove();
  };

  dragSurfaces.forEach(surface => {
    surface.addEventListener('pointerup', finishWidgetDrag);
    surface.addEventListener('pointercancel', finishWidgetDrag);
    surface.addEventListener('click', (event) => {
      if (!didDrag) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      didDrag = false;
    }, true);
  });

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.widgetApi?.showDeleteMenu();
  }, true);
}

if (!isWidgetMode) {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const optionIcon = document.getElementById('optionIcon');

  const openSidebar = () => {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
  };
  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
  };

  optionIcon?.addEventListener('click', () => {
    sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  sidebarOverlay?.addEventListener('click', closeSidebar);

  document.querySelector('.sidebar-menu li:first-child')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeSidebar();
    location.href = 'decorate.html';
  }, true);

  document.getElementById('placeWidgetButton')?.addEventListener('click', () => {
    closeSidebar();
    window.widgetApi?.placeWidget();
  });
}
