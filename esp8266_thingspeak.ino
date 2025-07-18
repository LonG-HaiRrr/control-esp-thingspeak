#include <ESP8266WiFi.h>
#include "ThingSpeak.h"

const char* ssid = "TP-LINK_6B6C";
const char* password = "07567902";
#define CHANNEL_ID 3010991
const char* WRITE_API_KEY = "JZTKGG4S7ELIOD15";

#define LED1_PIN D1
#define LED2_PIN D4
#define LED3_PIN D3
#define BUTTON_PIN D2

unsigned long lastUploadTime = 0;
unsigned long lastReadTime = 0;
const unsigned long uploadInterval = 15000; // 15 giây gửi dữ liệu lên Thingspeak
const unsigned long readInterval = 5000;    // 5 giây đọc trạng thái LED

WiFiClient client;

void setup() {
  Serial.begin(115200); delay(100);
  pinMode(LED1_PIN, OUTPUT); digitalWrite(LED1_PIN, LOW);
  pinMode(LED2_PIN, OUTPUT); digitalWrite(LED2_PIN, LOW);
  pinMode(LED3_PIN, OUTPUT); digitalWrite(LED3_PIN, LOW);
  pinMode(BUTTON_PIN, INPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  ThingSpeak.begin(client);
}

void loop() {
  // Đọc trạng thái đèn độc lập từ Thingspeak
  if (millis() - lastReadTime >= readInterval) {
    lastReadTime = millis();
    int led1 = ThingSpeak.readIntField(CHANNEL_ID, 1);
    int led2 = ThingSpeak.readIntField(CHANNEL_ID, 2);
    int led3 = ThingSpeak.readIntField(CHANNEL_ID, 3);
    if (!isnan(led1)) digitalWrite(LED1_PIN, led1);
    if (!isnan(led2)) digitalWrite(LED2_PIN, led2);
    if (!isnan(led3)) digitalWrite(LED3_PIN, led3);
  }

  // Xử lý nút nhấn: chỉ log khi chuyển từ LOW -> HIGH
  static int prevBtn = 0;
  int btn = digitalRead(BUTTON_PIN);
  int pushed = (btn == HIGH && prevBtn == LOW) ? 1 : 0;
  prevBtn = btn;

  // Mỗi chu kỳ uploadInterval, gửi dữ liệu ADC & nút nhấn lên Thingspeak
  if (millis() - lastUploadTime >= uploadInterval) {
    lastUploadTime = millis();
    int adcValue = analogRead(A0);
    ThingSpeak.setField(4, adcValue);  // field 4: ADC
    ThingSpeak.setField(5, pushed); // field 5: Lịch sử bấm nút (1 lần nhấn sẽ ghi 1)
    for(int i=1;i<=3;i++)  ThingSpeak.setField(i, digitalRead((i==1)?LED1_PIN:(i==2)?LED2_PIN:LED3_PIN));
    ThingSpeak.writeFields(CHANNEL_ID, WRITE_API_KEY);
  }
}
