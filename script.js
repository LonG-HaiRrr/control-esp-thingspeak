// Config
const CHANNEL_ID = 3010991;
const READ_API_KEY = "JOOY7F6GQUPDVQRC";

function fetchLedStatesAndAdc() {
  fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds/last.json?api_key=${READ_API_KEY}`)
    .then(res => res.json())
    .then(data => {
      // Đồng bộ trạng thái LED
      document.getElementById('led1').checked = data.field1 === "1";
      document.getElementById('led2').checked = data.field2 === "1";
      document.getElementById('led3').checked = data.field3 === "1";

      // Hiển thị ADC
      const adcEl = document.getElementById("adcValue");
      adcEl.textContent = data.field4;
      if (data.field1 === "1" || data.field2 === "1" || data.field3 === "1") {
        adcEl.style.color = "#fff";
      } else {
        adcEl.style.color = "#222";
      }
    });
}

function updateLED(n, val) {
  // Khi toggle, gọi API update trạng thái LED tương ứng
  const fieldKeyMap = ["field1", "field2", "field3"];
  let body = `${fieldKeyMap[n]}=${val ? 1 : 0}`;
  fetch(`https://api.thingspeak.com/update?api_key=JZTKGG4S7ELIOD15&${body}`, {
    method: "GET"
  }).then(() => setTimeout(fetchLedStatesAndAdc, 1000));
}

function fetchButtonHistory() {
  fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/5.json?api_key=${READ_API_KEY}&results=15`)
    .then(res => res.json())
    .then(data => {
      let html = "";
      if (data && data.feeds) {
        data.feeds.reverse().forEach(feed => {
          if(feed.field5 !== null){
            html += `<tr>
              <td>${new Date(feed.created_at).toLocaleString()}</td>
              <td>${feed.field5 === "1" ? "Đã Bấm" : " "}</td>
            </tr>`;
          }
        });
      }
      document.getElementById("history").innerHTML = html;
    });
}

document.addEventListener("DOMContentLoaded", function() {
  // Gán event toggle cho LED
  ["led1", "led2", "led3"].forEach((id, idx) => {
    document.getElementById(id).addEventListener("change", function(e) {
      updateLED(idx, this.checked);
    });
  });

  // Gọi lần đầu
  fetchLedStatesAndAdc();
  fetchButtonHistory();

  // Setup auto refresh LED/ADC/button history
  setInterval(fetchLedStatesAndAdc, 5000);
  setInterval(fetchButtonHistory, 12000);
});


function fetchThingSpeakInfo() {
  // Lấy thông tin channel
  fetch(`https://api.thingspeak.com/channels/${channelId}.json?api_key=${readApiKey}`)
    .then(res => res.json())
    .then(data => {
      // Ngày tạo channel
      let dt = new Date(data.created_at);
      dt = new Date(dt.getTime() + 7*3600*1000);
      document.getElementById('ts-created').textContent = 
        dt.toLocaleTimeString('vi-VN', {hour12: false}) + " " + dt.toLocaleDateString('vi-VN');
      // Số lượng entries
      document.getElementById('ts-entries').textContent = data.feeds_count || "--";
    });
  // Lấy entry cuối cùng
  fetch(`https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`)
    .then(res=>res.json())
    .then(data=>{
      let dt = new Date(data.created_at);
      dt = new Date(dt.getTime() + 7*3600*1000);
      document.getElementById('ts-lastentry').textContent = 
        dt.toLocaleTimeString('vi-VN', {hour12: false}) + " " + dt.toLocaleDateString('vi-VN');
    });
}
setInterval(fetchThingSpeakInfo, 10000); // 10s cập nhật 1 lần
window.onload = function () {
  pollStatesAndADC();
  updateButtons();
  renderHistoryFromThingSpeak(); // hoặc hàm lịch sử của bạn
  fetchThingSpeakInfo();
};

