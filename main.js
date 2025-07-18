// ==== Config channel/key theo thông tin của bạn ====
const channelId = 3010991;
const apiKey   = "JZTKGG4S7ELIOD15";
const readApiKey = "JOOY7F6GQUPDVQRC";
const ledFields = [1,2,3];    // field1,2,3
const adcField = 4;

// ==== Theme ====
function setTheme(dark) {
  if(dark){
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    document.getElementById('toggleContainer').classList.remove('checked');
    document.getElementById('note-block').style.color = "#fff";
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    document.getElementById('toggleContainer').classList.add('checked');
    document.getElementById('note-block').style.color = "#121212";
  }
}
const THEME_KEY = "darkMode";
function saveTheme(dark) {
  localStorage.setItem(THEME_KEY, dark ? "on" : "off");
}
function restoreTheme() {
  let isDark = true;
  if (localStorage.getItem(THEME_KEY) === "off") isDark = false;
  setTheme(isDark);
  document.getElementById('toggle-theme-checkbox').checked = !isDark;
}
document.addEventListener('DOMContentLoaded', function () {
  restoreTheme();
  document.getElementById('toggle-theme-checkbox').addEventListener('change', function () {
    let dark = !this.checked;
    setTheme(dark); saveTheme(dark);
  });
});

// ==== Nút điều khiển, đọc/gửi ====
let states = [false, false, false];
let sending = false;
function updateButtons() {
  for (let i = 0; i < 3; i++) {
    let btn = document.getElementById('btn' + (i + 1));
    btn.disabled = sending;
    btn.className = states[i] ? 'btn btn-tat' : 'btn btn-bat';
    btn.textContent = (states[i] ? 'TẮT' : 'BẬT') + ` LED ${i+1}`;
  }
}
function toggleButton(index) {
  if (sending) return;
  // Đổi trạng thái led dự kiến, gửi update lên ThingSpeak
  states[index] = !states[index];
  updateButtons();
  addPressHistory(index);
  sendData();
}
function sendData() {
  sending = true;
  updateButtons();
  // Chuẩn bị field dữ liệu gửi lên kênh mới (field1/2/3 là trạng thái LED)
  let url = `https://api.thingspeak.com/update?api_key=${apiKey}`;
  for(let i=0;i<3;i++) url += `&field${i+1}=`+(states[i]?1:0);
  fetch(url)
    .then(()=>{ sending=false; updateButtons(); })
    .catch(()=>{ sending=false; updateButtons(); });
}
// Đọc trạng thái từ ThingSpeak cập nhật giao diện
function pollStates() {
  let url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`;
  fetch(url)
  .then(res=>res.json())
  .then(data=>{
    // Field 1/2/3: Trang thai LED, Field 4 (adc)
    let led = [
      (parseInt(data.field1)||0)===1,
      (parseInt(data.field2)||0)===1,
      (parseInt(data.field3)||0)===1
    ];
    for(let i=0;i<3;i++) {
      document.getElementById('state'+(i+1)).textContent = led[i] ? 'ON' : 'OFF';
      document.getElementById('state'+(i+1)).className = 'state-indicator '+(led[i]?'on':'off');
      states[i] = led[i];
    }
    updateButtons();
    if(data.field4) updateAdcVisual(Number(data.field4));
  });
}
setInterval(pollStates, 1300);
window.onload = function () {
  pollStates();
  updateButtons();
  loadPressHistory();
  renderPressHistory();
};

// ==== Biểu đồ & Gauge ADC ====
let adcData = [];
const adcMaxLength = 30;
const adcLineCtx = document.getElementById('adcLineChart').getContext('2d');
const adcGaugeCtx = document.getElementById('adcGauge').getContext('2d');
let adcLineChart = new Chart(adcLineCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'ADC',
      backgroundColor: 'rgba(241,74,52,.10)',
      borderColor: '#e22929',
      borderWidth: 2,
      data: [],
      pointRadius: 4,
      pointBackgroundColor: '#e22929',
      tension: 0
    }]
  },
  options: {
    plugins: {legend:{display:false}, title:{display:true, text:'ADC', color:'#236bc9', font:{size:18, weight:'bold'}} }
  }
});
function drawAdcGauge(value) {
  const ctx = adcGaugeCtx;
  ctx.clearRect(0, 0, 220, 220);
  const centerX = 110, centerY = 110, radius = 85;
  ctx.save();
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.strokeStyle = i<3 ? "#1ad525" : (i<7 ? "#1a87e9" : "#ed3d3d");
    ctx.lineWidth = 15;
    const startA = Math.PI * (1 + i*1.9/10);
    const endA = Math.PI * (1 + (i+1)*1.9/10);
    ctx.arc(centerX, centerY, radius, startA, endA, false);
    ctx.stroke();
  }
  const percent = Math.max(0, Math.min(1, value / 1024));
  const angle = Math.PI * (1 + 1.9*percent);
  ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius-12, 0); ctx.lineWidth = 7; ctx.strokeStyle = "#e22929"; ctx.stroke(); ctx.restore();
  ctx.beginPath(); ctx.arc(centerX, centerY, 10, 0, Math.PI*2); ctx.fillStyle="#4a475a"; ctx.fill(); ctx.restore();
  ctx.font="12px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
  for (let v=0;v<=1024;v+=128) {
    const a = Math.PI * (1 + 1.9*v/1024);
    const tx = centerX + Math.cos(a)*(radius-20);
    const ty = centerY + Math.sin(a)*(radius-20);
    ctx.fillStyle="#222";
    ctx.fillText(v, tx, ty);
  }
}
function updateAdcVisual(newVal) {
  const now = new Date();
  const label = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  adcData.push({x: label, y: newVal});
  if (adcData.length > adcMaxLength) adcData.shift();
  adcLineChart.data.labels = adcData.map(v=>v.x);
  adcLineChart.data.datasets[0].data = adcData.map(v=>v.y);
  adcLineChart.update();
  drawAdcGauge(newVal);
  document.getElementById('adcGaugeValue').textContent = newVal;
}

// ==== Lịch sử nhấn nút ====
let pressHistory = [];
const pressLimit = 10;
let pressCount = 0;
function getButtonName(index) { return `LED ${index+1}`; }
function loadPressHistory() {
  try {
    let raw = localStorage.getItem("thingspeak-pressHistory");
    let ct  = localStorage.getItem("thingspeak-pressCount");
    if (raw) pressHistory = JSON.parse(raw);
    if (ct) pressCount = parseInt(ct);
    else pressCount = pressHistory.length;
  } catch(e) { pressHistory=[]; pressCount=0; }
}
function savePressHistory() {
  localStorage.setItem("thingspeak-pressHistory", JSON.stringify(pressHistory));
  localStorage.setItem("thingspeak-pressCount", pressCount);
}
function addPressHistory(index) {
  const now = new Date();
  const strTime = now.toLocaleTimeString("vi-VN", {hour12:false}) + " " + now.toLocaleDateString("vi-VN");
  pressHistory.unshift({ time: strTime, btn: getButtonName(index) });
  if (pressHistory.length > pressLimit) pressHistory.pop();
  pressCount++;
  savePressHistory();
  renderPressHistory();
}
function renderPressHistory() {
  const tbody = document.querySelector("#history-press-table tbody");
  tbody.innerHTML = "";
  pressHistory.forEach((val, idx) => {
    let row = document.createElement("tr");
    row.innerHTML = `<td style="text-align:center;">${idx+1}</td><td style="text-align:center;">${val.btn}</td><td style="text-align:center;">${val.time}</td>`;
    tbody.appendChild(row);
  });
  document.getElementById("press-count").textContent = pressCount || 0;
}

/* ========== INFO CHANEL ========== */
function timeAgo(dateStr) {
  if (!dateStr) return "--";
  const now = new Date();
  const d = new Date(dateStr);
  const diff = (now - d) / 1000; // giây
  if (isNaN(diff)) return "--";
  if (diff < 60) return `khoảng ${Math.round(diff)} giây trước`;
  if (diff < 3600) return `khoảng ${Math.round(diff/60)} phút trước`;
  if (diff < 86400) return `khoảng ${Math.round(diff/3600)} giờ trước`;
  return d.toLocaleString("en-GB");
}
function fetchTSInfo() {
  fetch(`https://api.thingspeak.com/channels/${channelId}.json?api_key=${readApiKey}`)
  .then(res => res.json())
  .then(ch => {
    document.getElementById('ts-created').textContent = timeAgo(ch.created_at);
  }).catch(() => {
    document.getElementById('ts-created').textContent = "--";
  });
  fetch(`https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=1`)
  .then(res => res.json())
  .then(data => {
    if (data && data.feeds && data.feeds.length > 0) {
      const lastFeed = data.feeds[0];
      document.getElementById('ts-lastentry').textContent = timeAgo(lastFeed.created_at);
      document.getElementById('ts-entries').textContent = lastFeed.entry_id;
    } else {
      document.getElementById('ts-lastentry').textContent = "--";
      document.getElementById('ts-entries').textContent = "0";
    }
  }).catch(() => {
    document.getElementById('ts-lastentry').textContent = "--";
    document.getElementById('ts-entries').textContent = "--";
  });
}
fetchTSInfo();
setInterval(fetchTSInfo, 12000);
