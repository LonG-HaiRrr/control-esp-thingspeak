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

// 21/07/2025 
  if (typeof adcLineChart !== "undefined") {
  let isDark = dark;
  let colorLine = isDark ? "#09f179ff" : "#8d0694ff"; //21/07/2025 màu lưới và chữ biểu đồ 
  adcLineChart.options.plugins.title.color = colorLine;
  adcLineChart.options.scales.x.grid.color = colorLine;
  adcLineChart.options.scales.x.ticks.color = colorLine;
  adcLineChart.options.scales.y.grid.color = colorLine;
  adcLineChart.options.scales.y.ticks.color = colorLine;
  adcLineChart.update();

  // 21/07/2025 
}

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
let sendInterval = null;
let countdownTimer = null;
let countdown = 0;

function updateButtons() {
  for (let i = 0; i < 3; i++) {
    const btn = document.getElementById('btn' + (i + 1));
    btn.disabled = sending;
    btn.className = states[i] ? 'btn btn-tat' : 'btn btn-bat';
    btn.textContent = (states[i] ? 'TẮT' : 'BẬT') + ` LED ${i + 1}`;
  }
}

function updateStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function sendData() {
  let url = `https://api.thingspeak.com/update?api_key=${apiKey}`;
  for (let i = 0; i < 3; i++) url += `&field${i + 1}=${states[i] ? 1 : 0}`;
  fetch(url);
  // Không làm gì thêm, không set sending ở đây
}

function toggleButton(index) {
  if (sending) return;
  states[index] = !states[index];
  updateButtons();

  sending = true;
  countdown = 30;
  updateStatus(`Đang gửi nút ${index + 1} đến ThingSpeak, vui lòng chờ ${countdown}s`);

  sendData(); // Gửi ngay lần đầu

  // Gửi lặp mỗi 
  sendInterval = setInterval(() => {
    sendData();
  }, 1000);

  // Đếm ngược và unlock sau 15s
  countdownTimer = setInterval(() => {
    countdown -= 1;
    if (countdown > 0) {
      updateStatus(`Đang gửi nút ${index + 1} đến ThingSpeak, vui lòng chờ ${countdown}s (vui lòng chỉ bấm nút huỷ chờ khi đã thay đổi trạng thái nút)`);
    } else {
      clearInterval(sendInterval);
      clearInterval(countdownTimer);
      sending = false;
      updateButtons();
      updateStatus("Đang chờ thao tác...");
    }
  }, 1000);
}


// ==== Đọc trạng thái + ADC ====
function pollStatesAndADC() {
  let url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      // Field 1/2/3: LED, Field 4: adc
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
      if(data.field4) updateAdcBoth(Number(data.field4));
    });
}

// Lấy lịch sử bấm nút từ field 5 ThingSpeak:
async function renderHistoryFromThingSpeak() {
  let url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=20`;
  let res = await fetch(url);
  let data = await res.json();
  let feeds = data.feeds || [];

  // Lệch 7h + 9 phút
  const timeOffset = 0;

  let btnHistory = [];
  for (let f of feeds.reverse()) {
    if (f.field5 && parseInt(f.field5) === 1) {
      let dt = new Date(f.created_at);
      dt = new Date(dt.getTime() + timeOffset); 
      let timeDisplay = dt.toLocaleTimeString('vi-VN', {hour12: false});
      let dateDisplay = dt.toLocaleDateString('vi-VN');
      btnHistory.push({
        time: timeDisplay,
        date: dateDisplay,
        btn: 'ESP gửi lên'
      });
      if (btnHistory.length >= 10) break;
    }
  }
  const tbody = document.querySelector("#history-press-table tbody");
  tbody.innerHTML = "";
  btnHistory.forEach((val, idx) => {
    let row = document.createElement("tr");
    row.innerHTML = `<td>${idx + 1}</td><td>${val.time}  ${'ngày'}    ${val.date}</td>`;
    tbody.appendChild(row);
  });
  document.getElementById('press-count').textContent = btnHistory.length;
}


setInterval(pollStatesAndADC, 5000);
setInterval(renderHistoryFromThingSpeak, 5000);

window.onload = function () {
  pollStatesAndADC();
  updateButtons();
  renderHistoryFromThingSpeak();
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
    datasets: [{ label: 'đây là biểu đồ giá trị ADC nha', backgroundColor: 'rgba(241,74,52,.10)', borderColor: '#e22929', borderWidth: 2, data: [], pointRadius: 4, pointBackgroundColor: '#e22929', tension: 0 }]
  },
options: {
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: 'bieu do ADC nha hihi',
      color: document.body.classList.contains('dark-mode') ? 'green' : '#222',
      font: { size: 18, weight: 'bold' }
    }
  },
  scales: {
    x: {
      grid: { color: document.body.classList.contains('dark-mode') ? 'green' : '#222' },
      ticks: { color: document.body.classList.contains('dark-mode') ? 'green' : '#222', font: { size: 13 } }
    },
    y: {
      grid: { color: document.body.classList.contains('dark-mode') ? 'green' : '#222' },
      ticks: { color: document.body.classList.contains('dark-mode') ? 'green' : '#222', font: { size: 13 } }
    }
  }
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
  ctx.lineTo(radius-12, 0);   // -18,0 sẽ dài hơn
  ctx.lineWidth = 2;
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
// chỉnh lại giao diện 21/07/2025
    const isDark = document.body.classList.contains('dark-mode');
ctx.fillStyle = isDark ? "#fff" : "#6d095eff"; // trắng cho dark, tím/hồng cho light
ctx.fillText(v, tx, ty);
// chỉnh lại giao diện 21/07/2025 Đổi màu số trên gauge theo giao diện - màu của số trên đồng hồ
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



// ==== thêm  ====
function fetchThingSpeakInfo() {
  // Lấy thông tin channel
  fetch(`https://api.thingspeak.com/channels/${channelId}.json?api_key=${readApiKey}`)
    .then(res => res.json())
    .then(data => {
      // Ngày tạo channel
      let dt = new Date(data.created_at);
      dt = new Date(dt.getTime() );         // hoặc thêm + 7*3600*1000
      document.getElementById('ts-created').textContent = 
        dt.toLocaleTimeString('vi-VN', {hour12: false}) + " " + dt.toLocaleDateString('vi-VN');
      // Số lượng entries
      document.getElementById('ts-entries').textContent = data.last_entry_id || "--";
      
    });
  // Lấy entry cuối cùng
  fetch(`https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`)
    .then(res=>res.json())
    .then(data=>{
      let dt = new Date(data.created_at);
      dt = new Date(dt.getTime());    // hoặc thêm + 7*3600*1000
      document.getElementById('ts-lastentry').textContent = 
        dt.toLocaleTimeString('vi-VN', {hour12: false}) + " " + dt.toLocaleDateString('vi-VN');
        let thoigiannow = Date.now();
      document.getElementById('tinhTHoiGian').textContent = 16 - Math.floor((thoigiannow - dt.getTime())/1000-150);  
    });
}
setInterval(fetchThingSpeakInfo, 1000); // 1s cập nhật 1 lần
window.onload = function () {
  pollStatesAndADC();
  updateButtons();
  renderHistoryFromThingSpeak(); // hoặc hàm lịch sử của bạn
  fetchThingSpeakInfo();
};


// Sự kiện bấm vào checkbox 'checkbox1'
document.getElementById('checkbox1').addEventListener('click', function(e) {
  if (sending) {
    clearInterval(sendInterval);
    clearInterval(countdownTimer);
    sending = false;
    updateButtons();
    updateStatus("Đang chờ thao tác...");
  }
  // Luôn set lại checked (checkbox bật lại)
  setTimeout(() => { 
    this.checked = true; 
  }, 50); // delay nhỏ cho tránh lỗi event
  e.preventDefault();  // Ngăn đổi trạng thái checkbox bằng click
});

