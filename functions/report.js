exports.handler = async (event) => {
  const p = event.queryStringParameters || {};

  // 필수 파라미터 체크
  if (!p.name) {
    return { statusCode: 400, body: "학생 이름이 없습니다." };
  }

  // 날짜 포맷 변환 (ISO → 보기 좋게)
  // 예: 2026-04-08T11:08:00.000+09:00 → 2026년 4월 8일 (수) / 오전 11:08
  function formatDate(isoStr) {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const day = days[d.getDay()];
      return `${year}년 ${month}월 ${date}일 (${day})`;
    } catch {
      return isoStr;
    }
  }

  function formatTime(isoStr) {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      const ampm = h < 12 ? "오전" : "오후";
      const hour = h % 12 || 12;
      return `${ampm} ${hour}:${m}`;
    } catch {
      return isoStr;
    }
  }

  // 파라미터 파싱
  const name        = p.name        || "-";
  const attend      = p.attend      || "-";          // "출석" | "결석" | "지각"
  const attendTime  = p.attendTime  || "";           // ISO 시각
  const progress    = p.progress    || "-";          // 오늘 진도
  const score       = p.score       || "-";          // 학생 점수 (숫자)
  const scoreTotal  = p.scoreTotal  || "10";         // 만점
  const avg         = p.avg         || "-";          // 반 평균
  const homework    = p.homework    || "-";          // 오늘 과제
  const prevHwName  = p.prevHwName  || "-";          // 지난 과제명
  const prevHwGrade = p.prevHwGrade || "-";          // 수행 등급
  const prevHwFb    = p.prevHwFb    || "-";          // 피드백
  const notice      = p.notice      || "";           // 공지사항
  const dateLabel   = formatDate(attendTime) || formatDate(p.date) || "-";
  const timeLabel   = formatTime(attendTime);

  // 출결 배지 색상
  const attendColor = attend === "출석"
    ? { bg: "#e8f6ee", color: "#1a7a45", border: "#a8d8bb" }
    : attend === "지각"
    ? { bg: "#fdf6e8", color: "#d4890a", border: "#f0c060" }
    : { bg: "#fdecea", color: "#b71c1c", border: "#f4a0a0" };

  // 점수 바 너비
  const scoreNum = parseFloat(score);
  const totalNum = parseFloat(scoreTotal);
  const avgNum   = parseFloat(avg);
  const scorePct = !isNaN(scoreNum) && !isNaN(totalNum) ? Math.round((scoreNum / totalNum) * 100) : 0;
  const avgPct   = !isNaN(avgNum)   && !isNaN(totalNum) ? Math.round((avgNum   / totalNum) * 100) : 0;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} 학생 일일 알림장</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#1a3a5c;--blue-light:#e8f0fb;--blue-accent:#3a74c8;
  --gray-bg:#f5f6f8;--gray-mid:#e8eaed;
  --text-main:#1a2535;--text-sub:#6b7585;--text-muted:#9ba5b4;
  --white:#ffffff;--radius:12px;--radius-sm:8px;
}
body{font-family:'Noto Sans KR',sans-serif;background:#eef1f6;color:var(--text-main);min-height:100vh;padding:20px 0 40px;-webkit-font-smoothing:antialiased}
.wrap{max-width:460px;margin:0 auto;padding:0 16px}
.header{background:var(--navy);border-radius:var(--radius) var(--radius) 0 0;padding:24px 22px 20px;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.04)}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border:0.5px solid rgba(255,255,255,.18);border-radius:20px;padding:3px 10px;margin-bottom:12px}
.badge .dot{width:6px;height:6px;border-radius:50%;background:#7ec8a0}
.badge span{font-size:11px;color:rgba(255,255,255,.75);letter-spacing:.06em;font-weight:500}
.header h1{font-size:20px;font-weight:700;color:#f0f6ff;margin-bottom:4px;line-height:1.3}
.header h1 em{font-style:normal;color:#7ec8e8}
.header .date{font-size:12px;color:rgba(255,255,255,.45);font-family:'DM Mono',monospace}
.card{background:var(--white);border-radius:0 0 var(--radius) var(--radius);border:0.5px solid var(--gray-mid);border-top:none;margin-bottom:12px;overflow:hidden}
.sec{padding:18px 22px;border-bottom:1px solid var(--gray-mid)}
.sec:last-child{border-bottom:none}
.sec-label{font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.attend-row{display:flex;align-items:center;gap:10px}
.badge-attend{border-radius:20px;padding:4px 14px;font-size:13px;font-weight:700;border-width:0.5px;border-style:solid;background:${attendColor.bg};color:${attendColor.color};border-color:${attendColor.border}}
.attend-time{font-size:13px;color:var(--text-sub)}
.attend-time b{font-weight:500;color:var(--text-main);font-family:'DM Mono',monospace}
.progress-box{font-size:14px;color:var(--text-main);line-height:1.6;padding:10px 14px;background:var(--blue-light);border-left:3px solid var(--blue-accent);border-radius:0 var(--radius-sm) var(--radius-sm) 0}
.score-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.score-card{background:var(--gray-bg);border-radius:var(--radius-sm);padding:12px 14px}
.sc-label{font-size:11px;color:var(--text-muted);margin-bottom:4px}
.sc-num{font-size:26px;font-weight:700;font-family:'DM Mono',monospace;line-height:1;color:var(--navy)}
.sc-num.avg{color:var(--text-sub)}
.sc-denom{font-size:12px;color:var(--text-muted);margin-left:2px}
.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.bar-row:last-child{margin-bottom:0}
.bar-label{font-size:11px;color:var(--text-sub);width:56px;flex-shrink:0}
.bar-track{flex:1;height:5px;background:var(--gray-mid);border-radius:3px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px}
.bar-fill.s{background:var(--navy)}
.bar-fill.a{background:#b0b8c8}
.bar-score{font-size:11px;font-weight:500;color:var(--text-sub);font-family:'DM Mono',monospace;width:28px;text-align:right;flex-shrink:0}
.hw-box{background:#fdf6e8;border-left:3px solid #d4890a;border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:12px 14px}
.hw-box p{font-size:13px;color:#5a3a00;line-height:1.7}
.prev-hw{background:var(--gray-bg);border-radius:var(--radius-sm);padding:14px 16px}
.prev-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.prev-name-label{font-size:11px;color:var(--text-muted);margin-bottom:3px}
.prev-name-val{font-size:14px;font-weight:500;color:var(--text-main);font-family:'DM Mono',monospace}
.badge-grade{background:#e8f6ee;color:#1a7a45;border:0.5px solid #a8d8bb;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;white-space:nowrap}
.divider{height:1px;background:var(--gray-mid);margin-bottom:10px}
.fb-label{font-size:11px;color:var(--text-muted);margin-bottom:4px}
.fb-text{font-size:13px;color:var(--text-main);line-height:1.7}
.notice-box{background:#eef3fc;border-left:3px solid var(--blue-accent);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:12px 14px}
.notice-box p{font-size:13px;color:#1a3060;line-height:1.7}
.footer{text-align:center;padding:0 0 8px}
.footer p{font-size:11px;color:var(--text-muted);line-height:1.8}
.footer .acad{font-size:12px;font-weight:500;color:var(--text-sub);margin-top:4px}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="badge"><div class="dot"></div><span>일일 알림장</span></div>
    <h1><em>${name}</em> 학생 학습 리포트</h1>
    <div class="date">${dateLabel}</div>
  </div>
  <div class="card">

    <div class="sec">
      <div class="sec-label">출결 현황</div>
      <div class="attend-row">
        <span class="badge-attend">${attend}</span>
        ${timeLabel !== "-" ? `<span class="attend-time">입실 확인 <b>${timeLabel}</b></span>` : ""}
      </div>
    </div>

    <div class="sec">
      <div class="sec-label">오늘의 진도</div>
      <div class="progress-box">${progress}</div>
    </div>

    <div class="sec">
      <div class="sec-label">단어 시험</div>
      <div class="score-grid">
        <div class="score-card">
          <div class="sc-label">${name} 점수</div>
          <div><span class="sc-num">${score}</span><span class="sc-denom">/ ${scoreTotal}점</span></div>
        </div>
        <div class="score-card">
          <div class="sc-label">반 평균</div>
          <div><span class="sc-num avg">${avg}</span><span class="sc-denom">/ ${scoreTotal}점</span></div>
        </div>
      </div>
      <div>
        <div class="bar-row">
          <span class="bar-label">${name}</span>
          <div class="bar-track"><div class="bar-fill s" style="width:${scorePct}%"></div></div>
          <span class="bar-score">${score}점</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">반 평균</span>
          <div class="bar-track"><div class="bar-fill a" style="width:${avgPct}%"></div></div>
          <span class="bar-score">${avg}점</span>
        </div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-label">오늘의 과제</div>
      <div class="hw-box"><p>${homework}</p></div>
    </div>

    <div class="sec">
      <div class="sec-label">지난주 과제 수행 결과</div>
      <div class="prev-hw">
        <div class="prev-top">
          <div>
            <div class="prev-name-label">과제명</div>
            <div class="prev-name-val">${prevHwName}</div>
          </div>
          <span class="badge-grade">${prevHwGrade}</span>
        </div>
        <div class="divider"></div>
        <div class="fb-label">선생님 피드백</div>
        <div class="fb-text">${prevHwFb}</div>
      </div>
    </div>

    ${notice ? `
    <div class="sec">
      <div class="sec-label">반 공지사항</div>
      <div class="notice-box"><p>${notice}</p></div>
    </div>` : ""}

  </div>
  <div class="footer">
    <p>본 알림은 학원에서 자동 발송되었습니다<br>문의사항은 학원으로 연락 주세요</p>
    <p class="acad">© 2026 Academy</p>
  </div>
</div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
};

