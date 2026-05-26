// 공공데이터포털 일반 인증키
const SERVICE_KEY = '7d3e97e35d4372badd887c4c6d7bfaa7d66ad258a95d45f76079d007b0380974';
const API_URL = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

let date = new Date();
let selectedDateKey = null;

// 연도별 공휴일 캐시 { 2025: { 'YYYY-MM-DD': '공휴일명', ... } }
const holidayCache = {};

const getMemos = () => JSON.parse(localStorage.getItem('calendarMemos') || '{}');
const saveMemos = (memos) => localStorage.setItem('calendarMemos', JSON.stringify(memos));

const makeDateKey = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

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

  // 이전 달 빈 칸
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="noColor"></div>`;
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

  // 다음 달 빈 칸
  for (let i = limitDay; i < nextDay; i++) {
    html += `<div class="noColor"></div>`;
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
const applyTheme = () => {
  const raw = localStorage.getItem('calendarTheme');
  if (!raw) return;
  try {
    const t = JSON.parse(raw);
    const root = document.querySelector('.rap');
    if (!root) return;

    if (t.font) {
      root.style.setProperty('--cal-font', t.font);
      root.style.fontFamily = t.font; // 직접도 적용
    }
    if (t.fontSize) {
      root.style.setProperty('--cal-font-size', t.fontSize);
      root.style.fontSize = t.fontSize;
    }
    if (t.bg) root.style.setProperty('--cal-bg', t.bg);

    if (t.fontColors) {
      root.style.setProperty('--font-week-color', t.fontColors.week || '#222');
      root.style.setProperty('--font-sat-color',  t.fontColors.sat  || '#1b6ae3');
      root.style.setProperty('--font-sun-color',  t.fontColors.sun  || '#e31b20');
    }

    if (t.defaultCell) root.style.setProperty('--cell-bg', t.defaultCell);

    if (t.otherCell && t.otherOpacity !== undefined) {
      const r = parseInt(t.otherCell.slice(1,3),16);
      const g = parseInt(t.otherCell.slice(3,5),16);
      const b = parseInt(t.otherCell.slice(5,7),16);
      root.style.setProperty('--other-overlay-color', `rgba(${r},${g},${b},${t.otherOpacity})`);
    }

    if (t.highlightColor && t.highlightOpacity !== undefined) {
      const r = parseInt(t.highlightColor.slice(1,3),16);
      const g = parseInt(t.highlightColor.slice(3,5),16);
      const b = parseInt(t.highlightColor.slice(5,7),16);
      const op  = t.highlightOpacity;
      const opB = Math.min(1, op * 2.5);
      root.style.setProperty('--today-bg',           `rgba(${r},${g},${b},${op})`);
      root.style.setProperty('--today-bg-hover',     `rgba(${r},${g},${b},${Math.min(1,op+0.05)})`);
      root.style.setProperty('--today-border',       `rgba(${r},${g},${b},${opB})`);
      root.style.setProperty('--today-border-hover', `rgba(${r},${g},${b},${Math.min(1,opB+0.1)})`);
      root.style.setProperty('--today-num-bg',       `rgba(${r},${g},${b},${Math.min(1,op*2)})`);
      root.style.setProperty('--today-num-color',    t.bg && isHexDark(t.bg) ? '#eee' : '#222');
    }

    if (t.headColors) {
      root.style.setProperty('--head-week-bg',  t.headColors.week || '#333');
      root.style.setProperty('--head-sat-bg',   t.headColors.sat  || '#1b6ae3');
      root.style.setProperty('--head-sun-bg',   t.headColors.sun  || '#e31b20');
    }

    if (t.headFontColors) {
      root.style.setProperty('--head-week-font', t.headFontColors.week || '#fff');
      root.style.setProperty('--head-sat-font',  t.headFontColors.sat  || '#fff');
      root.style.setProperty('--head-sun-font',  t.headFontColors.sun  || '#fff');
    }
  } catch(e) { console.error('테마 적용 오류:', e); }
};

const isHexDark = (hex) => {
  const r=parseInt(hex.slice(1,3),16),
        g=parseInt(hex.slice(3,5),16),
        b=parseInt(hex.slice(5,7),16);
  return (r*0.299+g*0.587+b*0.114) < 128;
};

window.onload = () => { applyTheme(); makeCalendar(date); };

document.querySelector('.prevDay').onclick = () => {
  date.setMonth(date.getMonth() - 1);
  makeCalendar(new Date(date));
};

document.querySelector('.nextDay').onclick = () => {
  date.setMonth(date.getMonth() + 1);
  makeCalendar(new Date(date));
};
// ===== 사이드바 =====
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const optionIcon     = document.getElementById('optionIcon');

const openSidebar = () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
};

const closeSidebar = () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
};

// 아이콘 클릭: 토글
optionIcon.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

// 사이드바 바깥(오버레이) 클릭: 닫기
sidebarOverlay.addEventListener('click', closeSidebar);