#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =========================== HARDWARE ==============================
#define LED_ENTRADA_PIN 13
#define BUZZER_PIN 4
#define LCD_ADDR 0x27
#define SMOKE_ANALOG_PIN 34
#define SMOKE_THRESHOLD 4000
#define LOCK_LED_PIN 2
#define LED_CONFIRMATION_PIN 16
#define TIMEOUT_DURATION_MS 15000UL

// RFID (SS = SDA)
#define SS_PIN 5
#define RST_PIN 0

// =========================== TECLADO ===============================
#define ROW_NUM 4
#define COLUMN_NUM 3

char keys[ROW_NUM][COLUMN_NUM] = {
  {'1','2','3'},
  {'4','5','6'},
  {'7','8','9'},
  {'*','0','#'}
};

byte pin_rows[ROW_NUM] = {12,14,27,26};
byte pin_column[COLUMN_NUM] = {25,33,32};

Keypad keypad = Keypad(makeKeymap(keys), pin_rows, pin_column, ROW_NUM, COLUMN_NUM);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
MFRC522 rfid(SS_PIN, RST_PIN);

// ========================== WI-FI / MQTT ===========================
const char* ssid = "iPhone de Nicholas";
const char* password = "12345678";
const char* mqtt_server = "172.20.10.2";

WiFiClient espClient;
PubSubClient client(espClient);
String espID;

// reconexão mqtt não bloqueante
unsigned long lastMqttReconnectAttempt = 0;
const unsigned long MQTT_RECONNECT_INTERVAL_MS = 5000;

// =========================== FUNÇÕES DE REDE =======================
void setup_wifi() {
  Serial.print("Conectando-se ao Wi-Fi: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(250);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi conectado!");
    Serial.print("Endereço IP: ");
    Serial.println(WiFi.localIP());
    espID = WiFi.macAddress();
    Serial.print("ESP ID: ");
    Serial.println(espID);
  } else {
    Serial.println("\nFalha ao conectar Wi-Fi (modo degradado).");
    espID = "UNKNOWN";
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Mensagem recebida [");
  Serial.print(topic);
  Serial.print("]: ");
  for (unsigned int i = 0; i < length; i++) Serial.print((char)payload[i]);
  Serial.println();
}

bool mqttTryReconnect() {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (client.connected()) return true;

  String clientId = "ESP32Client-" + espID;
  Serial.print("Tentando conectar ao broker MQTT com clientId=");
  Serial.println(clientId);

  if (client.connect(clientId.c_str())) {
    Serial.println("MQTT conectado!");
    client.subscribe("status/sala");
    // publicar um status inicial:
    DynamicJsonDocument d(200);
    d["espID"] = espID;
    d["status"] = "online";
    String s; serializeJson(d, s);
    client.publish("status/sala", s.c_str(), true);
    return true;
  } else {
    Serial.print("Falha MQTT (rc=");
    Serial.print(client.state());
    Serial.println(")");
    return false;
  }
}

void enviarStatusSalaMQTT(int id, const String& status, const String& espIDlocal) {
  if (!client.connected()) {
    Serial.println("MQTT offline — não foi possível enviar status");
    return;
  }
  DynamicJsonDocument doc(256);
  String mensagem = "Usuário com ID " + String(id) + " " + status + " da sala com a esp(" + espIDlocal + ")";
  doc["mensagem"] = mensagem;
  doc["id"] = id;
  doc["status"] = status;
  doc["espID"] = espIDlocal;
  String jsonString;
  serializeJson(doc, jsonString);
  client.publish("status/sala", jsonString.c_str());
  Serial.println("Mensagem enviada ao broker:");
  Serial.println(jsonString);
}

// =========================== SISTEMA DE ACESSO ======================
enum class SystemState {
  IDLE,
  ENTRY_WAITING_FOR_PASSWORD,
  ENTRY_GROUP_WAITING_FOR_SIZE,
  EMERGENCY_ALARM
};

class SistemaAcesso {
private:
  const String ID_1_PASS = "1234";
  const String ID_3_PASS = "55555";

  // UIDs normalizados (SEM espaços, MAIÚSCULAS)
  const String RFID_ID_1 = "9C592049";
  const String RFID_ID_2 = "C3CD0515";
  const String RFID_ID_3 = "DCDBD237";

  SystemState current_state = SystemState::IDLE;
  int selected_id = 0;
  unsigned long last_interaction_time = 0;
  String input_data;

  bool is_inside_id1 = false;
  bool is_inside_id2 = false;
  int group_count_id3 = 0;

public:
  void setup() {
    // NÃO inicializa Serial aqui (feito no setup global)
    input_data.reserve(32);

    pinMode(LOCK_LED_PIN, OUTPUT);
    digitalWrite(LOCK_LED_PIN, HIGH);
    pinMode(LED_ENTRADA_PIN, OUTPUT);
    digitalWrite(LED_ENTRADA_PIN, HIGH);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(LED_CONFIRMATION_PIN, OUTPUT);
    digitalWrite(LED_CONFIRMATION_PIN, LOW);

    lcd.init();
    lcd.backlight();
    displayStatus("Porta Trancada", "Passe o Cartao");

    // Inicializar SPI com pinos ESP32 e RFID (essencial)
    SPI.begin(18, 19, 23, SS_PIN);
    rfid.PCD_Init();
    delay(50);
    Serial.println("RFID inicializado.");
  }

  void loop() {
    // Atualiza timers/estado
    if (current_state == SystemState::EMERGENCY_ALARM) {
      if (!checkSmokeAlarm()) {
        resetState("Alarme Desligado", "Passe o Cartao");
      }
      // enquanto em ALARME não processa entradas
      return;
    }

    checkTimeout();

    // Processa RFID apenas se estamos em IDLE (ou procedimento que aceite leitura)
    if (current_state == SystemState::IDLE) checkRFID();

    // Processa teclado se esperando senha ou grupo
    if (current_state == SystemState::ENTRY_WAITING_FOR_PASSWORD ||
        current_state == SystemState::ENTRY_GROUP_WAITING_FOR_SIZE) {
      checkKeypad();
    }
  }

private:
  // normaliza UID lido (sem espaços e maiúsculo)
  String normalizeUID(const String& raw) {
    String s = "";
    for (size_t i = 0; i < raw.length(); ++i) {
      char c = raw.charAt(i);
      if (c == ' ') continue;
      s += c;
    }
    s.toUpperCase();
    return s;
  }

  void checkRFID() {
    // detecta presença de cartão novo
    if (!rfid.PICC_IsNewCardPresent()) return;
    if (!rfid.PICC_ReadCardSerial()) {
      // se falhou ao ler, tenta parar crypto e sai
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      return;
    }

    // Monta UID sem espaços
    String rawUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) rawUID += "0";
      rawUID += String(rfid.uid.uidByte[i], HEX);
      if (i < rfid.uid.size - 1) rawUID += " ";
    }
    String readUID = normalizeUID(rawUID);

    Serial.print("UID lido (raw): ");
    Serial.println(rawUID);
    Serial.print("UID normalizado: ");
    Serial.println(readUID);

    // compara com os cadastrados
    if (readUID == RFID_ID_1) selected_id = 1;
    else if (readUID == RFID_ID_2) selected_id = 2;
    else if (readUID == RFID_ID_3) selected_id = 3;
    else {
      handleAccessDenied();
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      return;
    }

    last_interaction_time = millis();
    beep(100, 1500);
    digitalWrite(LED_CONFIRMATION_PIN, HIGH);

    if (getPresenceStatus(selected_id)) {
      handleExitConfirmation();
    } else if (selected_id == 2) {
      // id2 tem entrada automática (exemplo do seu requisito)
      handleEntry(selected_id, true, 1);
    } else {
      current_state = SystemState::ENTRY_WAITING_FOR_PASSWORD;
      displayStatus("DIGITE SUA SENHA:", "                ");
    }

    // finaliza comunicação com o cartão de forma limpa
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  void handleEntry(int id, bool success, int group_size) {
    if (success) {
      modifyPresenceStatus(id, true, group_size);
      enviarStatusSalaMQTT(id, "entrou", espID);
      displayStatus("ACESSO PERMITIDO", "Bem-vindo!");
      digitalWrite(LOCK_LED_PIN, LOW);
      beep(100, 3000); delay(50); beep(100, 3000);
      delay(1000);
      resetState("Porta Trancada", "Passe o Cartao");
    } else {
      handleAccessDenied();
    }
  }

  void handleExitConfirmation(int count = 1) {
    modifyPresenceStatus(selected_id, false, count);
    enviarStatusSalaMQTT(selected_id, "saiu", espID);
    digitalWrite(LOCK_LED_PIN, LOW);
    beep(100, 3000); delay(50); beep(100, 3000);
    displayStatus("SAIDA REGISTRADA", "DESTRANCADO!");
    delay(1000);
    resetState("Porta Trancada", "Passe o Cartao");
  }

  void modifyPresenceStatus(int id, bool entry, int count = 1) {
    if (id == 1) is_inside_id1 = entry;
    else if (id == 2) is_inside_id2 = entry;
    else if (id == 3) {
      if (entry) group_count_id3 += count;
      else group_count_id3 = max(0, group_count_id3 - count);
    }
    Serial.print("ID "); Serial.print(id);
    Serial.println(entry ? " Entrou." : " Saiu.");
  }

  bool getPresenceStatus(int id) {
    if (id == 1) return is_inside_id1;
    if (id == 2) return is_inside_id2;
    if (id == 3) return (group_count_id3 > 0);
    return false;
  }

  bool checkSmokeAlarm() {
    return (analogRead(SMOKE_ANALOG_PIN) >= SMOKE_THRESHOLD);
  }

  void beep(int duration_ms, int frequency) {
    tone(BUZZER_PIN, frequency, duration_ms);
    delay(duration_ms);
    noTone(BUZZER_PIN);
  }

  void displayStatus(const String& line1, const String& line2) {
    lcd.clear();
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
  }

  void checkTimeout() {
    if (current_state != SystemState::IDLE && current_state != SystemState::EMERGENCY_ALARM) {
      if (millis() - last_interaction_time > TIMEOUT_DURATION_MS) {
        resetState("Tempo Esgotado!", "Passe o Cartao");
      }
    }
  }

  void checkKeypad() {
    char key = keypad.getKey();
    if (!key) return;
    last_interaction_time = millis();
    beep(50, 2000);
    if (key == '*') handleCancel();
    else if (key == '#') handleEnterConfirmation();
    else input_data += key;
  }

  void handleEnterConfirmation() {
    if (input_data == ID_1_PASS || input_data == ID_3_PASS)
      handleEntry(selected_id, true, 1);
    else
      handleAccessDenied();
    input_data = "";
  }

  void handleAccessDenied() {
    beep(200, 500);
    displayStatus("ACESSO NEGADO!", "Tente Novamente");
    delay(1000);
    resetState("Porta Trancada", "Passe o Cartao");
  }

  void handleCancel() {
    beep(100, 400);
    resetState("Cancelado!", "Passe o Cartao");
  }

  void resetState(const String& l1, const String& l2) {
    current_state = SystemState::IDLE;
    selected_id = 0;
    input_data = "";
    digitalWrite(LED_CONFIRMATION_PIN, LOW);
    digitalWrite(LOCK_LED_PIN, HIGH);
    digitalWrite(LED_ENTRADA_PIN, HIGH);
    noTone(BUZZER_PIN);
    displayStatus(l1, l2);
  }

  void handleEmergencyAlarm() {
    current_state = SystemState::EMERGENCY_ALARM;
    digitalWrite(LOCK_LED_PIN, LOW);
    displayStatus("ALARME FOGO", "PORTA ABERTA!");
    tone(BUZZER_PIN, 4000);
    delay(200);
    noTone(BUZZER_PIN);
  }
};

// =========================== PRINCIPAL ==============================
SistemaAcesso sistema;

void setup() {
  // Serial inicializado apenas aqui
  Serial.begin(115200);
  delay(50);
  Serial.println("\n=== Iniciando Sistema de Acesso ===");

  // Inicializa LCD (para mensagens iniciais)
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("Inicializando...");

  // Conecta Wi-Fi (para termos espID antes de MQTT)
  setup_wifi();

  // Configura MQTT
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  // Inicializa subsistemas (RFID, pinos, keypad)
  sistema.setup();

  // Marca primeira tentativa de reconexão MQTT
  lastMqttReconnectAttempt = 0;
}

void loop() {
  // Tenta reconectar MQTT de forma não bloqueante
  if (!client.connected()) {
    if (millis() - lastMqttReconnectAttempt > MQTT_RECONNECT_INTERVAL_MS) {
      lastMqttReconnectAttempt = millis();
      mqttTryReconnect();
    }
  } else {
    // processa mensagens MQTT
    client.loop();
  }

  // Loop do sistema (RFID, keypad, alarmes)
  sistema.loop();
}
