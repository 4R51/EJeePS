#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

TinyGPSPlus gps;
HardwareSerial GPSserial(1);   // Use UART1
HTTPClient http;

const char* ssid = "WIFI_SSID";
const char* password = "WIFI_PASS";

// Your Vercel endpoint
String endpoint = "https://e-jee-ps.vercel.app/api/update";


void setup() {
  Serial.begin(115200);

  // GPS on UART1
  GPSserial.begin(9600, SERIAL_8N1, 16, 17);  
  //              baud, format, RXpin, TXpin

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected");
}


void loop() {
  while (GPSserial.available()) {
    gps.encode(GPSserial.read());
  }

  if (gps.location.isUpdated()) {

    float lat = gps.location.lat();
    float lng = gps.location.lng();

    // Create payload
    String payload = "{\"lat\":" + String(lat, 6) +
                     ",\"lng\":" + String(lng, 6) + "}";

    // HTTP client must be declared INSIDE loop
    HTTPClient http;
    http.begin(endpoint);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST(payload);
    Serial.print("POST code: ");
    Serial.println(code);

    String response = http.getString();
    Serial.println("Response:");
    Serial.println(response);

    http.end();
  }

  delay(1000);
}
