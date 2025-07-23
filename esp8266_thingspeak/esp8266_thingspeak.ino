#include <ESP8266WiFi.h>
#include "ThingSpeak.h"

// const char* ssid = "cuongbeo155";
// const char* password = "123456789";

const char* ssid = "TP-LINK_6B6C";
const char* password = "07567902";


#define CHANNEL_ID 3015544
const char* WRITE_API_KEY = "V2MJGA7INPFLS39G";

#define LED1_PIN D1
#define LED2_PIN D5
#define LED3_PIN D6
#define BUTTON_PIN D2
#define LED4_PIN D9  // sáng led khi bạn bấm nút ?
#define LED7_PIN D4  // còi khi gửi thành công


unsigned long lastUploadTime = 0;
unsigned long djtconmemay = 0;
unsigned long lastReadTime = 0;
const unsigned long uploadInterval = 15000;  // 15 giây gửi dữ liệu lên Thingspeak
const unsigned long readInterval = 1000;     //01 giây đọc trạng thái LED

WiFiClient client;

void setup() {
  Serial.begin(115200);
  delay(100);
  pinMode(LED1_PIN, OUTPUT);
  digitalWrite(LED1_PIN, LOW);
  pinMode(LED2_PIN, OUTPUT);
  digitalWrite(LED2_PIN, LOW);
  pinMode(LED3_PIN, OUTPUT);
  digitalWrite(LED3_PIN, LOW);
  pinMode(BUTTON_PIN, INPUT);  // <-- dùng INPUT, đúng với pull-down!
  pinMode(LED4_PIN, OUTPUT);
  digitalWrite(LED4_PIN, HIGH);  // LOGIC ĐẢO: HIGH = OFF, LOW = ON
  pinMode(LED7_PIN, OUTPUT);
  digitalWrite(LED7_PIN, LOW);  // Đặt trạng thái ban đầu TẮT
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

  // Phát hiện nhấn nút cạnh lên (từ LOW lên HIGH)
  static int prevBtn = LOW;  // Giá trị mặc định là LOW vì pull-down
  static int pushedFlag = 0;
  int btn = digitalRead(BUTTON_PIN);
  if (btn == HIGH && prevBtn == LOW) {  // vừa nhấn nút!
    pushedFlag = 1;
    Serial.print("bạn vừa bấm nút 1? ");
    digitalWrite(LED4_PIN, HIGH);
  } else {
    digitalWrite(LED4_PIN, LOW);
  }
  prevBtn = btn;

  // Gửi dữ liệu lên Thingspeak mỗi 15s
  if (millis() - lastUploadTime >= uploadInterval) {
    lastUploadTime = millis();
    int adcValue = analogRead(A0);
    ThingSpeak.setField(4, adcValue);    // field 4: ADC
    ThingSpeak.setField(5, pushedFlag);  // field 5: bấm nút
    for (int i = 1; i <= 3; i++)
      ThingSpeak.setField(i, digitalRead((i == 1) ? LED1_PIN : (i == 2) ? LED2_PIN
                                                                        : LED3_PIN));
    ThingSpeak.writeFields(CHANNEL_ID, WRITE_API_KEY);

    // Debug Serial
    Serial.print(" btn pushedFlag = ");
    Serial.print(btn);
    Serial.println(pushedFlag);

    pushedFlag = 0;  // reset cờ sau khi gửi
  }


  unsigned long elapsed = millis() / 1000;
  if (elapsed % 15 == 14) {
    digitalWrite(LED7_PIN, HIGH);
    Serial.print("rẹot đi tu see: ");
  } else if (elapsed % 15 == 0) {
    digitalWrite(LED7_PIN, LOW);
    Serial.print("gits pun ");
  }
}
