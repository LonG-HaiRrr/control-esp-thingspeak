// ==== Config channel/key ==== 
const channelId = 3010991;
const apiKey = "JZTKGG4S7ELIOD15";
const readApiKey = "JOOY7F6GQUPDVQRC";

// ==== Theme (Day/Night button with image bg) ====
// ... (Các hàm setTheme, saveTheme, restoreTheme, DOMContentLoaded giữ nguyên) ...

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
  countdown = 17; // Đổi 17s ở đây!
  updateStatus(`Đang gửi nút ${index + 1} đến ThingSpeak, vui lòng chờ ${countdown}s`);

  sendData(); // Gửi ngay lần đầu

  // Gửi lặp mỗi 17 giây nếu muốn (bỏ nếu chỉ gửi 1 lần):
  // sendInterval = setInterval(() => { sendData(); }, 17000);

  // Đếm ngược và unlock sau 17s
  countdownTimer = setInterval(() => {
    countdown -= 1;
    if (countdown > 0) {
      updateStatus(`Đang gửi nút ${index + 1} đến ThingSpeak, vui lòng chờ ${countdown}s (vui lòng chỉ bấm nút huỷ chờ khi đã thay đổi trạng thái nút)`);
    } else {
      // clearInterval(sendInterval); // nếu dùng sendInterval  
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

// ==== setInterval thành 17 GIÂY như yêu cầu ====
setInterval(pollStatesAndADC, 17000);
setInterval(renderHistoryFromThingSpeak, 17000);

// ==== Biểu đồ & Gauge ADC ====
// ... (giữ nguyên code đo vẽ biểu đồ, không sửa gì)

// ==== thêm ==== 
function fetchThingSpeakInfo() {
  fetch(`https://api.thingspeak.com/channels/${channelId}.json?api_key=${readApiKey}`)
    .then(res => res.json())
    .then(data => {
      let dt = new Date(data.created_at);
      dt = new Date(dt.getTime() );         
      document.getElementById('ts-created').textContent = 
        dt.toLocaleTimeString('vi-VN', {hour12: false}) + " " + dt.toLocaleDateString('vi-VN');
      document.getElementById('ts-entries').textContent = data.last_entry_id || "--"; 
    });
  fetch(`https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`)
    .then(res=>res.json())
    .then(data=>{
      let dt = new Date(data.created_at);
      dt = new Date(dt.getTime());    
      document.getElementById('ts-lastentry').textContent = 
        dt.toLocaleTimeString('vi-VN', {hour12: false}) + " " + dt.toLocaleDateString('vi-VN');
        let thoigiannow = Date.now();
      document.getElementById('tinhTHoiGian').textContent = 16 - Math.floor((thoigiannow - dt.getTime())/1000-150);  
    });
}

setInterval(fetchThingSpeakInfo, 17000); // <<< Đổi thành 17 giây luôn!

window.onload = function () {
  pollStatesAndADC();
  updateButtons();
  renderHistoryFromThingSpeak();
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
  setTimeout(() => { 
    this.checked = true; 
  }, 50);
  e.preventDefault();
});
