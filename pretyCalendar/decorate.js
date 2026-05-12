// ===== 미리보기 캘린더 생성 =====
const FIRST_DOW  = 3; // 수요일 시작
const TOTAL_DAYS = 30;
const HOLIDAY_DAY = 7;  // 일요일
const MEMO_DAY   = 1;
const TODAY_DAY  = 5;

const board = document.getElementById('previewBoard');

const renderPreview = () => {
  const nextDay = Math.ceil((FIRST_DOW + TOTAL_DAYS) / 7) * 7;
  let html = '';

  for (let i = 0; i < FIRST_DOW; i++) {
    html += `<div class="p-empty"></div>`;
  }

  for (let i = 1; i <= TOTAL_DAYS; i++) {
    const dow = (FIRST_DOW + i - 1) % 7;
    const isSun     = dow === 0;
    const isSat     = dow === 6;
    const isHoliday = i === HOLIDAY_DAY;
    const isMemo    = i === MEMO_DAY;
    const isToday   = i === TODAY_DAY;

    let numClass = 'p-num';
    if (isSun || isHoliday) numClass += ' red';
    else if (isSat)         numClass += ' blue';
    if (isToday)            numClass += ' today-num';

    const holidayHtml = isHoliday ? `<span class="p-holiday">공휴일</span>` : '';
    const memoHtml    = isMemo    ? `<span class="p-memo">메모가 적혀있어요</span>` : '';
    const cellClass   = 'p-cell' + (isToday ? ' p-today' : '');

    html += `<div class="${cellClass}">
      <div class="p-day-top">
        <span class="${numClass}">${i}</span>
        ${holidayHtml}
      </div>
      ${memoHtml}
    </div>`;
  }

  const filled = FIRST_DOW + TOTAL_DAYS;
  for (let i = filled; i < nextDay; i++) {
    html += `<div class="p-empty"></div>`;
  }

  board.innerHTML = html;
};

renderPreview();

// ===== 헬퍼: 다크 여부 판단 =====
const isDarkBg = (bg) => {
  const dark = ['#1e1e2e', '#111', '#222', '#000'];
  return dark.some(d => bg.startsWith(d));
};

// ===== 폰트 종류 =====
document.getElementById('fontFamily').addEventListener('change', (e) => {
  document.getElementById('previewCal').style.fontFamily = e.target.value;
});

// ===== 폰트 사이즈 =====
document.getElementById('fontSize').addEventListener('change', (e) => {
  document.getElementById('previewCal').style.fontSize = e.target.value;
});

// ===== 백그라운드 =====
document.querySelectorAll('.bg-options .deco-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-options .deco-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cal = document.getElementById('previewCal');
    const bg  = btn.dataset.bg;
    cal.style.background = bg;

    const dark = isDarkBg(bg);
    cal.style.color = dark ? '#eee' : '';
    cal.querySelector('.cal-title').style.color = dark ? '#eee' : '';
  });
});

// ===== 저장 =====
document.getElementById('btnDecoSave').addEventListener('click', () => {
  localStorage.setItem('decoFont',     document.getElementById('fontFamily').value);
  localStorage.setItem('decoFontSize', document.getElementById('fontSize').value);

  const activeBg = document.querySelector('.bg-options .deco-btn.active');
  if (activeBg) localStorage.setItem('decoBg', activeBg.dataset.bg);

  alert('설정이 저장되었습니다!');
});

// ===== 나가기 =====
document.getElementById('btnDecoExit').addEventListener('click', () => {
  location.href = 'index.html';
});

// ===== 저장된 값 불러오기 =====
window.onload = () => {
  const savedFont     = localStorage.getItem('decoFont');
  const savedFontSize = localStorage.getItem('decoFontSize');
  const savedBg       = localStorage.getItem('decoBg');

  const cal = document.getElementById('previewCal');

  if (savedFont) {
    document.getElementById('fontFamily').value = savedFont;
    cal.style.fontFamily = savedFont;
  }

  if (savedFontSize) {
    document.getElementById('fontSize').value = savedFontSize;
    cal.style.fontSize = savedFontSize;
  }

  if (savedBg) {
    cal.style.background = savedBg;
    document.querySelectorAll('.bg-options .deco-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.bg === savedBg);
    });
    if (isDarkBg(savedBg)) {
      cal.style.color = '#eee';
      cal.querySelector('.cal-title').style.color = '#eee';
    }
  }
};