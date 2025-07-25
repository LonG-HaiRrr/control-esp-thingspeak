// ==== Config channel/key ====
const channelId = 3010991;
const apiKey = "JZTKGG4S7ELIOD15";
const readApiKey = "JOOY7F6GQUPDVQRC";

// ==== Theme (Day/Night button with image bg) ====
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
  // Đổi màu ADC label, các chữ trên biểu đồ, gauge...
  const adcLabels = document.querySelectorAll('.adcChartLabel');
  adcLabels.forEach(el => {
    el.style.color = dark ? '#b2c7ed' : '#236bc9';
  });
}
const THEME_KEY = "darkMode";
function saveTheme(dark) { localStorage.setItem(THEME_KEY, dark ? "on" : "off"); }
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
    setTheme(dark);
    saveTheme(dark);
  });
});

// ==== Nút điều khiển/đọc trạng thái/ gửi lệnh ====
let states = [false, false, false];
let sending = false;
let countdownInterval = null;
const countdownSeconds = 6;

function setStatus(msg, color = '') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = msg;
  statusDiv.style.color = color;
}

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
  states[index] = !states[index];
  updateButtons();
  sendData(index);
}

function sendData(indexChanged) {
  sending = true;
  updateButtons();
  let ledStatus = states[indexChanged] ? "bật" : "tắt";
  let ledName = `LED ${indexChanged+1}`;
  let left = countdownSeconds;

  clearInterval(countdownInterval);
  setStatus(`Đã gửi tín hiệu: ${ledStatus} ${ledName} đến Thingspeak, vui lòng chờ... (${left}s)`, "orange");

  // Gửi dữ liệu lên ThingSpeak
  let url = `https://api.thingspeak.com/update?api_key=${apiKey}`;
  for (let i = 0; i < 3; i++)
    url += `&field${i+1}=${states[i]?1:0}`;

  fetch(url)
    .then(() => {
      // Bắt đầu countdown đếm ngược, khóa nút trong lúc chờ
      countdownInterval = setInterval(() => {
        left--;
        if (left > 0) {
          setStatus(`Đã gửi tín hiệu: ${ledStatus} ${ledName} đến Thingspeak, vui lòng chờ... (${left}s)`, "orange");
        } else {
          clearInterval(countdownInterval);
          setStatus('Đang chờ thao tác...', "");
          sending = false;
          updateButtons();
          pollStatesled();
          pollAdcc();
        }
      }, 1000);
    })
    .catch(() => {
      setStatus('Lỗi gửi tín hiệu! Thử lại.', "red");
      sending = false;
      updateButtons();
    });
}

// ==== Đọc trạng thái + ADC ====
function pollStatesled() {
  let url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      // Field 1/2/3: LED
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
    });
}
function pollAdcc() {
  let url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      //  Field 4: adc
      updateButtons();
      if(data.field4) updateAdcBoth(Number(data.field4));
    });
}
setInterval(pollStatesled, 3000);
setInterval(pollAdcc, 8000);

// ==== Lịch sử bấm nút từ field 5 ThingSpeak ====
async function renderHistoryFromThingSpeak() {
  let url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=20`;
  let res = await fetch(url);
  let data = await res.json();
  let feeds = data.feeds || [];
  let btnHistory = [];
  for (let f of feeds.reverse()) {
    if (f.field5 && parseInt(f.field5) === 1) {
      let dt = new Date(f.created_at);
      dt = new Date(dt.getTime() + 7 * 60 * 60 * 1000);
      let timeDisplay = dt.toLocaleTimeString('vi-VN', {hour12: false}) + " " + dt.toLocaleDateString('vi-VN');
      btnHistory.push({ time: timeDisplay, btn: 'ESP gửi lên' });
      if (btnHistory.length >= 10) break;
    }
  }
  const tbody = document.querySelector("#history-press-table tbody");
  tbody.innerHTML = "";
  btnHistory.forEach((val, idx) => {
    let row = document.createElement("tr");
    row.innerHTML = `<td>${idx + 1}</td><td>${val.btn}</td><td>${val.time}</td>`;
    tbody.appendChild(row);
  });
  document.getElementById('press-count').textContent = btnHistory.length;
}
setInterval(renderHistoryFromThingSpeak, 5000);

// ==== Biểu đồ & Gauge ADC ====
let adcData = [];
const adcMaxLength = 30;
const adcLineCtx = document.getElementById('adcLineChart').getContext('2d');
const adcGaugeCtx = document.getElementById('adcGauge').getContext('2d');
let adcLineChart = new Chart(adcLineCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{ label: 'ADC', backgroundColor: 'rgba(241,74,52,.10)', borderColor: '#e22929', borderWidth: 2, data: [], pointRadius: 4, pointBackgroundColor: '#e22929', tension: 0 }]
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
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius-12, 0);
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#e22929";
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(centerX, centerY, 10, 0, Math.PI*2);
  ctx.fillStyle="#4a475a";
  ctx.fill();
  ctx.restore();
  ctx.font="12px monospace";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  for (let v=0;v<=1024;v+=128) {
    const a = Math.PI * (1 + 1.9*v/1024);
    const tx = centerX + Math.cos(a)*(radius-20);
    const ty = centerY + Math.sin(a)*(radius-20);
    ctx.fillStyle="#222";
    ctx.fillText(v, tx, ty);
  }
}
function updateAdcBoth(newVal) {
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

// ==== Thông tin khởi tạo channel, thao tác cuối ====
let prevCreatedAt = ""; // Lưu lại created_at cũ
let lastUpdateTimestamp = 0; // timestamp dạng millisec

function fetchThingSpeakInfo() {
  // Thông tin channel (không thay đổi)
  fetch(`https://api.thingspeak.com/channels/${channelId}.json?api_key=${readApiKey}`)
    .then(res => res.json())
    .then(data => {
      let dt = new Date(data.created_at);
      document.getElementById('ts-created').textContent =
        dt.toLocaleTimeString('vi-VN', { hour12: false }) + " " + dt.toLocaleDateString('vi-VN');
      document.getElementById('ts-entries').textContent = data.last_entry_id || "--";
    });

  // Thông tin bản ghi mới nhất
  fetch(`https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`)
    .then(res => res.json())
    .then(data => {
      let dt = new Date(data.created_at);  // ISO format
      document.getElementById('ts-lastentry').textContent =
        dt.toLocaleTimeString('vi-VN', { hour12: false }) + " " + dt.toLocaleDateString('vi-VN');

      // Nếu bản ghi mới → cập nhật thời điểm nhận
      if (data.created_at !== prevCreatedAt) {
        prevCreatedAt = data.created_at;
        lastUpdateTimestamp = Date.now();
      }

      // Tính số mili giây đã trôi qua kể từ lần update cuối
      let millisElapsed = Date.now() - lastUpdateTimestamp;
      document.getElementById('ts-nextupdate').textContent = millisElapsed + " ms";
    });
}


// Gọi hàm mỗi giây để đồng bộ countdown (hoặc vẫn giữ 10s)
setInterval(fetchThingSpeakInfo, 100); // hoặc giữ nguyên 10s tùy ý, càng nhanh càng realtime


// ==== Init ====
window.onload = function () {
  pollStatesled();
  pollAdcc();
  updateButtons();
  renderHistoryFromThingSpeak();
  fetchThingSpeakInfo();
};
