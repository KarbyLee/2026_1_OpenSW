// 현재 표시 중인 날짜 객체
let date = new Date();

const makeCalendar = (targetDate) => {
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth() + 1;

  // 이번 달의 첫 날 요일 (0: 일요일, 6: 토요일)
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  // 이번 달의 마지막 날짜
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();

  const limitDay = firstDay + lastDay;
  const nextDay = Math.ceil(limitDay / 7) * 7;

  let htmlDummy = '';

  // 1. 이전 달 빈 칸 채우기
  for (let i = 0; i < firstDay; i++) {
    htmlDummy += `<div class="noColor"></div>`;
  }

  // 2. 이번 달 날짜 채우기
  for (let i = 1; i <= lastDay; i++) {    
    htmlDummy += `<div>${i}</div>`;
  }

  // 3. 다음 달 빈 칸 채우기 (7일 단위 맞춤)
  for (let i = limitDay; i < nextDay; i++) {
    htmlDummy += `<div class="noColor"></div>`;
  }

  // 화면에 반영
  document.querySelector(`.dateBoard`).innerHTML = htmlDummy;
  document.querySelector(`.dateTitle`).innerText = `${currentYear}년 ${currentMonth}월`;
}

// 초기 실행
window.onload = () => {
  makeCalendar(date);
};

// 버튼 클릭 이벤트 처리
document.querySelector(`.prevDay`).onclick = () => {
  date.setMonth(date.getMonth() - 1);
  makeCalendar(new Date(date));
}

document.querySelector(`.nextDay`).onclick = () => {
  date.setMonth(date.getMonth() + 1);
  makeCalendar(new Date(date));
}