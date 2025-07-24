#include <ESP8266WiFi.h>
#include "ThingSpeak.h"

const char* ssid = "TP-LINK_6B6C";
const char* password = "07567902";

#define CHANNEL_ID1 3010991
const char* WRITE_API_KEY1 = "JZTKGG4S7ELIOD15";
#define CHANNEL_ID2 3015544
const char* WRITE_API_KEY2 = "V2MJGA7INPFLS39G";

#define LED1_PIN D1   // io5
#define LED2_PIN D5   // io14
#define LED3_PIN D6   // io12
#define BUTTON_PIN D2 // io4
#define LED4_PIN D7   // io13
#define LED7_PIN D4   // io2

unsigned long lastUploadTime = 0;
unsigned long lastReadTime = 0;
const unsigned long uploadInterval = 16000;  // 15 giây
const unsigned long readInterval = 16000;    // 15 giây
int led7_trangthai = LOW;
WiFiClient client;

void setup() {
  Serial.begin(115200);
  delay(100);
  pinMode(LED1_PIN, OUTPUT);    digitalWrite(LED1_PIN, LOW);
  pinMode(LED2_PIN, OUTPUT);    digitalWrite(LED2_PIN, LOW);
  pinMode(LED3_PIN, OUTPUT);    digitalWrite(LED3_PIN, LOW);
  pinMode(BUTTON_PIN, INPUT);   // dùng INPUT, đúng với pull-down
  pinMode(LED4_PIN, OUTPUT);    digitalWrite(LED4_PIN, HIGH);  // LOGIC ĐẢO: HIGH = OFF, LOW = ON
  pinMode(LED7_PIN, OUTPUT);    digitalWrite(LED7_PIN, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  ThingSpeak.begin(client);
}

void loop() {
  // 1. Đọc nút
  static int prevBtn = 0;
  static int pushedFlag = 0;
  int btn = digitalRead(BUTTON_PIN);
  if (btn == 1 && prevBtn == 0) {
    pushedFlag = 1;
    Serial.print("c ");
    digitalWrite(LED4_PIN, HIGH);
  } else {
    digitalWrite(LED4_PIN, LOW);
  }
  prevBtn = btn;

  // 2. Đọc từ ThingSpeak
  if (millis() - lastReadTime >= readInterval) {
    lastReadTime = millis();
    int led1 = ThingSpeak.readIntField(CHANNEL_ID1, 1);
    int led2 = ThingSpeak.readIntField(CHANNEL_ID1, 2);
    int led3 = ThingSpeak.readIntField(CHANNEL_ID1, 3);
    if (!isnan(led1)) digitalWrite(LED1_PIN, led1);
    if (!isnan(led2)) digitalWrite(LED2_PIN, led2);
    if (!isnan(led3)) digitalWrite(LED3_PIN, led3);
  }

  // 3. Gửi dữ liệu lên ThingSpeak
  if (millis() - lastUploadTime >= uploadInterval) {
    lastUploadTime = millis();
    int adcValue = analogRead(A0);
    ThingSpeak.setField(4, adcValue);
    ThingSpeak.setField(5, pushedFlag);
    for (int i = 1; i <= 3; i++) {
      int pin = (i == 1) ? LED1_PIN : (i == 2) ? LED2_PIN : LED3_PIN;
      ThingSpeak.setField(i, digitalRead(pin));
    }
    ThingSpeak.writeFields(CHANNEL_ID1, WRITE_API_KEY1);
    int adcValue1 = analogRead(A0);
    ThingSpeak.setField(4, adcValue);
    ThingSpeak.setField(5, pushedFlag);
    for (int i = 1; i <= 3; i++) {
      int pin = (i == 1) ? LED1_PIN : (i == 2) ? LED2_PIN : LED3_PIN;
      ThingSpeak.setField(i, digitalRead(pin));
    }
    ThingSpeak.writeFields(CHANNEL_ID2, WRITE_API_KEY2);
    pushedFlag = 0;
  }
}
