#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <mbedtls/sha256.h> 
#include <ArduinoJson.h> 
#include <WiFi.h> 
#include <PubSubClient.h> 

// =========================== CONFIGURAÇÕES WI-FI FIXAS ==============================
const char* WIFI_SSID = "iPhone de Nicholas"; 
const char* WIFI_PASS = "12345678"; 

// =========================== CONFIGURAÇÕES MQTT ===================================
const char* MQTT_SERVER = "172.20.10.3"; 
const int MQTT_PORT = 1883;                     
const char* MQTT_CLIENT_ID = "ESP32_Acesso_ID"; 
const char* TOPICO_PUBLICACAO = "acesso/credenciais"; 
String TOPICO_ASSINATURA = ""; 

// =========================== HARDWARE & PINAGEM ==============================
#define BUZZER_PIN 12          
#define LED_RFID_STATUS_PIN 4  // LED Azul (Status de Leitura do Crachá)
#define WIFI_STATUS_LED_PIN 14 // LED Amarelo (Status Wi-Fi)
#define RELAY_PIN 13           // Pino para controle do Relé (GPIO 13)

#define LCD_ADDR 0x27
#define TIMEOUT_DURATION_MS 15000UL // Timeout para entrada de UID/PIN
#define MQTT_TIMEOUT_MS 10000UL    // Timeout para resposta do Broker (10 segundos)

// RFID
#define SS_PIN 5
#define RST_PIN 2

// TECLADO (4x3)
#define ROW_NUM 4
#define COLUMN_NUM 3

char keys[ROW_NUM][COLUMN_NUM] = {
    {'1','2','3'}, {'4','5','6'}, {'7','8','9'}, {'*','0','#'}
};

byte pin_rows[ROW_NUM] = {16, 17, 25, 26}; 
byte pin_column[COLUMN_NUM] = {27, 32, 33}; 

Keypad keypad = Keypad(makeKeymap(keys), pin_rows, pin_column, ROW_NUM, COLUMN_NUM);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
MFRC522 rfid(SS_PIN, RST_PIN);

// =========================== OBJETOS GLOBAIS ==============================
WiFiClient espClient;
PubSubClient client(espClient);

// =========================== ESTADOS E DADOS GLOBAIS ==============================
enum class SystemState {
    IDLE,
    WAITING_FOR_UID_SIMULATION, 
    WAITING_FOR_PASSWORD,
    PROCESSING                 
};

SystemState current_state = SystemState::IDLE;
String rfid_uid_simulated = ""; 
String input_pin = "";
unsigned long last_interaction_time = 0;
unsigned long processing_start_time = 0; // Novo timer para o estado PROCESSING

String hash_uid = "";
String hash_pin = "";

bool is_wifi_connected = false;
unsigned long last_led_toggle_time = 0;


// =========================== FUNÇÕES AUXILIARES ==============================

String sha256(const String& data) {
    if (data.length() == 0) return "";
    uint8_t hash[32];
    mbedtls_sha256_context ctx;
    mbedtls_sha256_init(&ctx);
    mbedtls_sha256_starts(&ctx, 0); 
    mbedtls_sha256_update(&ctx, (const unsigned char*)data.c_str(), data.length());
    mbedtls_sha256_finish(&ctx, hash); 
    mbedtls_sha256_free(&ctx);

    String result = "";
    for (int i = 0; i < 32; i++) {
        if (hash[i] < 0x10) result += "0";
        result += String(hash[i], HEX);
    }
    return result;
}

void beep(int duration_ms, int frequency) {
    tone(BUZZER_PIN, frequency, duration_ms);
    delay(duration_ms);
    noTone(BUZZER_PIN);
}

void displayStatus(const String& line1, const String& line2, bool make_beep = true) {
    lcd.clear();
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
    if (make_beep) beep(50, 4000);
}

void resetState(const String& l1, const String& l2) {
    current_state = SystemState::IDLE;
    input_pin = "";
    rfid_uid_simulated = "";
    hash_uid = ""; 
    hash_pin = ""; 
    digitalWrite(LED_RFID_STATUS_PIN, LOW); // LED Azul Desliga
    displayStatus(l1, l2, false); 
}

/**
 * Checa o timeout para WAITING_FOR_UID_SIMULATION, WAITING_FOR_PASSWORD e PROCESSING.
 */
void checkTimeout() {
    if (current_state == SystemState::WAITING_FOR_UID_SIMULATION ||
        current_state == SystemState::WAITING_FOR_PASSWORD) {
        if (millis() - last_interaction_time > TIMEOUT_DURATION_MS) {
            Serial.println("Timeout: Tempo esgotado para entrada de dados.");
            beep(200, 300); 
            resetState("TEMPO ESGOTADO", "Insira o cracha"); 
        }
    } else if (current_state == SystemState::PROCESSING) {
        if (millis() - processing_start_time > MQTT_TIMEOUT_MS) {
            Serial.println("[MQTT ERRO] Timeout: Nenhuma resposta do Broker.");
            beep(500, 500); 
            resetState("TIMEOUT MQTT", "Tente Novamente");
        }
    }
}

String getMacAddress() {
    return WiFi.macAddress();
}

void setWifiLedState(String mode) {
    if (mode == "ON") {
        digitalWrite(WIFI_STATUS_LED_PIN, HIGH);
    } else if (mode == "OFF") {
        digitalWrite(WIFI_STATUS_LED_PIN, LOW);
    } else if (mode == "FAST_BLINK") {
        unsigned long current_time = millis();
        if (current_time - last_led_toggle_time >= 100) {
            digitalWrite(WIFI_STATUS_LED_PIN, !digitalRead(WIFI_STATUS_LED_PIN));
            last_led_toggle_time = current_time;
        }
    }
}

bool connectToWiFi() {
    Serial.print("[WIFI] Tentando conectar a: "); Serial.println(WIFI_SSID);
    displayStatus("Conectando:", String(WIFI_SSID).substring(0, 16));
    
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    
    unsigned long start_time = millis();
    
    while (WiFi.status() != WL_CONNECTED && millis() - start_time < 20000) { 
        setWifiLedState("FAST_BLINK"); 
        delay(2000); 
        
        Serial.print(".");
        if (WiFi.status() != WL_DISCONNECTED) {
            Serial.print(" (Status: "); Serial.print(WiFi.status()); Serial.print(")");
        }
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        is_wifi_connected = true;
        setWifiLedState("ON"); 
        Serial.println("\n[WIFI] Conectado!");
        Serial.print("IP Address: "); Serial.println(WiFi.localIP());
        displayStatus("Conectado!", WiFi.localIP().toString());
        delay(2000);
        return true;
    } else {
        is_wifi_connected = false;
        setWifiLedState("OFF"); 
        Serial.print("\n[WIFI] Falha na conexao final. Status: "); Serial.println(WiFi.status());
        displayStatus("Falha Conexao", "Wi-Fi OFF");
        delay(2000);
        return false;
    }
}


/**
 * Lógica do Subscriber: Chamada quando uma mensagem MQTT é recebida.
 */
void callback(char* topic, byte* payload, unsigned int length) {
    // Sai imediatamente do estado PROCESSING, desativando o MQTT_TIMEOUT
    current_state = SystemState::IDLE; 
    
    Serial.println("\n<<< MENSAGEM MQTT RECEBIDA >>>");
    Serial.print("Tópico: ");
    Serial.println(topic);
    
    // Converte o payload (byte array) para String
    String payload_str = "";
    for (unsigned int i = 0; i < length; i++) {
        payload_str += (char)payload[i];
    }
    
    // FEEDBACK APERFEIÇOADO PARA O JSON RECEBIDO
    Serial.println("=====================================");
    Serial.println(">>> JSON DE RESPOSTA RECEBIDO <<<");
    Serial.println(payload_str);
    Serial.println("=====================================");
    
    // Processamento do JSON
    const size_t capacity = JSON_OBJECT_SIZE(3) + 100;
    StaticJsonDocument<capacity> doc;
    DeserializationError error = deserializeJson(doc, payload_str);

    if (error) {
        Serial.print("[JSON ERRO] Falha ao desserializar: ");
        Serial.println(error.c_str());
        displayStatus("JSON Invalido", "IGNORADO");
        return;
    }

    const char* acesso = doc["Acesso"];
    
    // --- Lógica de Controle de Acesso ---
    if (String(acesso).equalsIgnoreCase("Accept")) {
        Serial.println("[ACESSO] Acesso Liberado. Acionando Relé (GPIO 13).");
        displayStatus("ACESSO", "LIBERADO");
        
        digitalWrite(RELAY_PIN, HIGH); // Ativa o Relé
        beep(100, 3500); 
        delay(3000); 
        digitalWrite(RELAY_PIN, LOW);  // Desativa o Relé
        
    } else if (String(acesso).equalsIgnoreCase("Deny")) {
        Serial.println("[ACESSO] Acesso Negado.");
        displayStatus("ACESSO", "NEGADO");
        
        digitalWrite(RELAY_PIN, LOW); // Garante que o relé esteja desligado
        beep(500, 800); 
        delay(3000);
    }
    
    resetState("Insira o cracha", ""); // Retorna ao estado IDLE
}

/**
 * Tenta reconectar ao broker MQTT e Assina o Tópico.
 */
void reconnectMQTT() {
    while (!client.connected()) {
        Serial.println("-------------------------------------");
        Serial.print("[MQTT] Tentando conexao ao broker: ");
        Serial.print(MQTT_SERVER);
        Serial.print("...");
        displayStatus("MQTT Tentando", String(MQTT_SERVER));

        // Só tenta conectar se o Wi-Fi estiver OK
        if (WiFi.status() == WL_CONNECTED && client.connect(MQTT_CLIENT_ID)) {
            Serial.println(" conectado!");
            
            if (client.subscribe(TOPICO_ASSINATURA.c_str())) {
                Serial.print("[MQTT] Assinado com sucesso no tópico: ");
                Serial.println(TOPICO_ASSINATURA);
                displayStatus("MQTT Conectado!", "Assinado");
            } else {
                Serial.println("[MQTT ERRO] Falha na Assinatura!");
                displayStatus("MQTT Conectado!", "Erro Assin.");
            }
            Serial.println("-------------------------------------");
        } else {
            Serial.print(" falhou, rc=");
            Serial.print(client.state());
            Serial.println(" Tente novamente em 5 segundos");
            displayStatus("MQTT Falhou", "RC: " + String(client.state()));
            delay(5000);
            
            // Se o Wi-Fi cair enquanto tenta o MQTT, força a reconexão Wi-Fi
            if (WiFi.status() != WL_CONNECTED) {
                is_wifi_connected = false;
                break; // Sai do loop MQTT para tentar o Wi-Fi
            }
        }
    }
}

void publishJSON(const String& json_payload) {
    Serial.println("=====================================");
    Serial.println("JSON GERADO PARA ENVIO:");
    Serial.println(json_payload); 
    Serial.println("=====================================");
    
    if (is_wifi_connected && client.connected()) {
        
        if (client.publish(TOPICO_PUBLICACAO, json_payload.c_str())) {
            Serial.println("[MQTT SUCESSO] JSON PUBLICADO!");
            Serial.print("-> Tópico: "); Serial.println(TOPICO_PUBLICACAO);
            displayStatus("MQTT Publicado!", "Aguardando...");
            
            // INICIA O TIMER DE PROCESSAMENTO APÓS A PUBLICAÇÃO
            processing_start_time = millis();
            
        } else {
            Serial.println("[MQTT FALHA] Falha na Publicação (Erro interno do Broker).");
            displayStatus("MQTT Falhou", "Erro Public.");
            current_state = SystemState::IDLE; // Volta ao estado inicial em caso de falha na publicação
        }
    } else {
        Serial.println("[MQTT AVISO] Publicação ignorada: Wi-Fi ou Broker desconectado.");
        displayStatus("Erro Public.", "Sem Conexao");
        current_state = SystemState::IDLE; // Volta ao estado inicial
    }
}


// =========================== LÓGICA DO SISTEMA DE ACESSO ==============================

void checkStart() {
    char key = keypad.getKey();
    if (!key) return;
    
    if (key != '*') {
        current_state = SystemState::WAITING_FOR_UID_SIMULATION;
        rfid_uid_simulated = "";
        last_interaction_time = millis();
        digitalWrite(LED_RFID_STATUS_PIN, LOW); 
        displayStatus("SIMULAR CRACHA", "SENHA: "); 
        beep(100, 1000);
    } else {
        beep(50, 400);
    }
}

void checkKeypad() {
    char key = keypad.getKey();
    if (!key) return;
    
    last_interaction_time = millis();
    beep(50, 2000); 

    if (key >= '0' && key <= '9') {
        String* target_input = (current_state == SystemState::WAITING_FOR_UID_SIMULATION) ? 
                                &rfid_uid_simulated : &input_pin;

        if (target_input->length() < 16) { 
            *target_input += key;
            
            lcd.setCursor(0, 1);
            lcd.print("SENHA: ");
            String stars = "";
            for (size_t i = 0; i < target_input->length(); i++) stars += "*";
            lcd.print(stars);
        }
        return;
    }
    
    if (current_state == SystemState::WAITING_FOR_UID_SIMULATION) {
        if (key == '*') {
            if (rfid_uid_simulated.length() == 0) {
                displayStatus("UID VAZIO!", "Tente Novamente");
                delay(1000);
                displayStatus("SIMULAR CRACHA", "SENHA: ");
                return;
            }
            
            hash_uid = sha256(rfid_uid_simulated);
            
            digitalWrite(LED_RFID_STATUS_PIN, HIGH); 
            
            current_state = SystemState::WAITING_FOR_PASSWORD;
            displayStatus("Insira o PIN", "SENHA: "); 
            return;
        }
        
    } else if (current_state == SystemState::WAITING_FOR_PASSWORD) {
        if (key == '#') {
            if (input_pin.length() == 0) {
                displayStatus("PIN VAZIO!", "Tente Novamente");
                delay(1000);
                displayStatus("Insira o PIN", "SENHA: ");
                return;
            }

            hash_pin = sha256(input_pin);
            String combined_string = hash_uid + hash_pin;
            String final_hash = sha256(combined_string);
            
            // FEEDBACK DETALHADO DO HASH
            Serial.println("\n-------------------------------------");
            Serial.println("--- GERAÇÃO DE HASH PARA PUBLICAÇÃO ---");
            Serial.print("UID (simulado): "); Serial.print(rfid_uid_simulated); 
            Serial.print(" | Hash UID: "); Serial.println(hash_uid);
            Serial.print("PIN (digitado): "); Serial.print(input_pin); 
            Serial.print(" | Hash PIN: "); Serial.println(hash_pin);
            Serial.println("-------------------------------------");
            Serial.print("Concatenação de Hashes: "); Serial.println(combined_string);
            Serial.print("HASH FINAL (no JSON): "); Serial.println(final_hash);
            Serial.println("-------------------------------------");
            
            const size_t capacity = JSON_OBJECT_SIZE(3) + 120; 
            StaticJsonDocument<capacity> doc;
            
            doc["ID_RFID"] = rfid_uid_simulated; 
            doc["espID"] = getMacAddress();      
            doc["HASH"] = final_hash;            

            String json_output;
            serializeJson(doc, json_output);

            current_state = SystemState::PROCESSING;
            displayStatus("ANALISANDO", "CREDENCIAL...");
            
            // PUBLICAÇÃO MQTT (O timer é iniciado dentro desta função)
            publishJSON(json_output);
            
        } else if (key == '*') {
            Serial.println("Operacao Cancelada pelo usuario.");
            beep(100, 400); 
            resetState("Cancelado!", "Insira o cracha"); 
        }
    }
}


// =========================== SETUP & LOOP PRINCIPAIS ==============================

void setup() {
    Serial.begin(115200);
    delay(500); 
    
    // 1. Inicialização de Hardware
    pinMode(LED_RFID_STATUS_PIN, OUTPUT); digitalWrite(LED_RFID_STATUS_PIN, LOW); 
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(WIFI_STATUS_LED_PIN, OUTPUT); digitalWrite(WIFI_STATUS_LED_PIN, LOW); 
    pinMode(RELAY_PIN, OUTPUT); digitalWrite(RELAY_PIN, LOW); 
    
    // 2. Inicialização LCD/RFID
    Wire.begin(21, 22); 
    lcd.init(); 
    lcd.backlight();
    SPI.begin(18, 19, 23, SS_PIN); 
    rfid.PCD_Init();
    
    // 3. Tenta Conectar Wi-Fi
    WiFi.mode(WIFI_STA); 
    Serial.println("SISTEMA DE ACESSO (INICIANDO...)");
    connectToWiFi();

    // 4. Configura MQTT
    client.setServer(MQTT_SERVER, MQTT_PORT);
    client.setCallback(callback); 
    
    // 5. Gera o tópico de assinatura específico para este MAC
    TOPICO_ASSINATURA = "acesso/resposta/" + getMacAddress();

    Serial.print("MAC Address (espID): "); Serial.println(getMacAddress());
    Serial.print("Tópico de Assinatura: "); Serial.println(TOPICO_ASSINATURA);

    // Estado Inicial do Sistema de Acesso
    resetState("Insira o cracha", ""); 
}

void loop() {
    
    // 1. Manutenção da Conexão Wi-Fi (LED Amarelo)
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WIFI] Desconectado. Tentando reconectar...");
        is_wifi_connected = false;
        setWifiLedState("FAST_BLINK");
        connectToWiFi(); // Tenta reconectar
    } 
    
    if (is_wifi_connected) {
        setWifiLedState("ON");

        // 2. Manutenção da Conexão MQTT
        if (!client.connected()) {
            reconnectMQTT();
        }
        
        // 3. Processamento de Mensagens Recebidas e Manutenção do Ping
        client.loop(); 

    } else {
        setWifiLedState("OFF");
    }

    // 4. Lógica do Sistema de Acesso (incluindo timeouts)
    checkTimeout();

    switch (current_state) {
        case SystemState::IDLE:
            checkStart(); 
            break;
        case SystemState::WAITING_FOR_UID_SIMULATION:
        case SystemState::WAITING_FOR_PASSWORD:
            checkKeypad();
            break;
        case SystemState::PROCESSING:
            // Aguarda a resposta do broker via MQTT (callback)
            // O timeout é verificado em checkTimeout()
            break;
    }
}