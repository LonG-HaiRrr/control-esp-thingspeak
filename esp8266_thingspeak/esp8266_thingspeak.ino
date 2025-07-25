#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// WiFi info
const char* ssid = "TP-LINK_6B6C";
const char* password = "07567902";

// MQTT info (HiveMQ Cloud)
const char* mqtt_server = "72dc2407d9904812adc42646b74eeb05.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "hivemq.webclient.1753343217820";
const char* mqtt_pass = "W2Zy>n*QFqxD3Uj.7?1r";

// MQTT topic
const char* mqtt_pub_topic = "esp8266/button";   // gửi trạng thái nút nhấn
const char* mqtt_sub_topic = "esp8266/control";  // nhận lệnh điều khiển

// Nút nhấn
#define BUTTON_PIN D2

WiFiClientSecure espClient;
PubSubClient client(espClient);

int lastButtonState = HIGH;

// Hàm xử lý khi có dữ liệu MQTT đến
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📩 Nhận từ topic: ");
  Serial.println(topic);

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("🔹 Nội dung: ");
  Serial.println(message);

  // Xử lý lệnh
  if (message == "hello") {
    Serial.println(message);
  } else if (message == "led_on") {
    Serial.println("👉 Lệnh bật LED (ví dụ)");
    // digitalWrite(LED_BUILTIN, LOW);
  } else if (message == "led_off") {
    Serial.println("👉 Lệnh tắt LED (ví dụ)");
    // digitalWrite(LED_BUILTIN, HIGH);
  }
}

void setup_wifi() {
  delay(10);
  Serial.printf("🔌 Đang kết nối WiFi: %s\n", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi đã kết nối");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("🔁 Kết nối MQTT...");
    if (client.connect("ESP8266Client", mqtt_user, mqtt_pass)) {
      Serial.println("✅ MQTT đã kết nối");

      // Đăng ký nhận topic
      client.subscribe(mqtt_sub_topic);
      Serial.printf("📥 Đã subscribe topic: %s\n", mqtt_sub_topic);

    } else {
      Serial.print("❌ Lỗi MQTT: ");
      Serial.print(client.state());
      Serial.println(" → thử lại sau 5s");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);  // Nút nối GND

  setup_wifi();

  // Kết nối MQTT
  espClient.setInsecure();  // chỉ test, không bảo mật
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Đọc nút nhấn
  int buttonState = digitalRead(BUTTON_PIN);
  if (buttonState != lastButtonState) {
    lastButtonState = buttonState;

    if (buttonState == HIGH) {
      Serial.println("👆 Nút được nhấn");
      client.publish(mqtt_pub_topic, "on");
    } else {
      Serial.print("👇 Nút được thả");
      client.publish(mqtt_pub_topic, "tat");
    }
  }

  delay(50);  // debounce
}
