#include <SPI.h>
#include <Ethernet.h>
#include <MQTT.h>
#include "arduino_secrets.h"

// Pinos usados pelo Ethernet Shield W5100 no Arduino Mega.
const uint8_t PIN_SD_CS = 4;
const uint8_t PIN_ETHERNET_CS = 10;
const uint8_t MEGA_SPI_SS_PIN = 53;

// MAC localmente administrado e exclusivo desta instalacao.
byte ethernetMac[] = {0x02, 0x4D, 0x45, 0x47, 0x41, 0x01};

IPAddress mqttBroker(192, 168, 0, 10);
const uint16_t MQTT_PORT = 1883;
const char MQTT_CLIENT_ID[] = "mega-central-01";

const char TOPIC_STATUS[] = "casa/mega/status";
const char TOPIC_TEST_COMMAND[] = "casa/mega/comando/teste";
const char TOPIC_TEST_RESPONSE[] = "casa/mega/evento/teste";
const char TOPIC_UPTIME[] = "casa/mega/telemetria/uptime";

const unsigned long MQTT_RECONNECT_INTERVAL_MS = 5000UL;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000UL;

EthernetClient ethernetClient;
MQTTClient mqttClient(256);

bool networkReady = false;
bool testResponsePending = false;
unsigned long lastMqttAttemptMs = 0;
unsigned long lastHeartbeatMs = 0;

void printIp(const char *label, IPAddress address) {
  Serial.print(label);
  Serial.println(address);
}

void onMqttMessage(String &topic, String &payload) {
  Serial.print(F("MQTT recebido ["));
  Serial.print(topic);
  Serial.print(F("]: "));
  Serial.println(payload);

  // Este firmware de diagnostico nunca aciona saidas.
  // A resposta sera publicada fora do callback para evitar bloqueios na biblioteca.
  if (topic == TOPIC_TEST_COMMAND) {
    testResponsePending = true;
  }
}

bool startEthernet() {
  Serial.println(F("Solicitando endereco ao DHCP..."));

  // Desabilita o leitor de cartao SD do shield para nao disputar o barramento SPI.
  pinMode(PIN_SD_CS, OUTPUT);
  digitalWrite(PIN_SD_CS, HIGH);

  // O pino SS de hardware do Mega precisa permanecer como saida no modo SPI master.
  pinMode(MEGA_SPI_SS_PIN, OUTPUT);
  digitalWrite(MEGA_SPI_SS_PIN, HIGH);

  // No W5100 original, o chip-select Ethernet ja usa o pino 10 por padrao.
  // Nao chamamos Ethernet.init() para manter compatibilidade com a biblioteca
  // Ethernet que acompanha versoes antigas do Arduino IDE.
  if (Ethernet.begin(ethernetMac) == 0) {
    Serial.println(F("ERRO: DHCP nao forneceu um endereco IP."));
    return false;
  }

  delay(1000);
  printIp("IP do Mega: ", Ethernet.localIP());
  printIp("Gateway: ", Ethernet.gatewayIP());
  printIp("DNS: ", Ethernet.dnsServerIP());

  return true;
}

void configureMqtt() {
  mqttClient.begin(mqttBroker, MQTT_PORT, ethernetClient);
  mqttClient.onMessage(onMqttMessage);
  mqttClient.setWill(TOPIC_STATUS, "offline", true, 1);
}

void connectMqttIfNeeded() {
  if (!networkReady || mqttClient.connected()) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastMqttAttemptMs < MQTT_RECONNECT_INTERVAL_MS) {
    return;
  }
  lastMqttAttemptMs = now;

  Serial.print(F("Conectando ao Mosquitto em 192.168.0.10... "));

  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println(F("conectado."));
    mqttClient.subscribe(TOPIC_TEST_COMMAND, 1);
    mqttClient.publish(TOPIC_STATUS, "online", true, 1);
  } else {
    Serial.print(F("falhou. Erro de rede="));
    Serial.print((int)mqttClient.lastError());
    Serial.print(F(", retorno MQTT="));
    Serial.println((int)mqttClient.returnCode());
  }
}

void publishPendingTestResponse() {
  if (!testResponsePending || !mqttClient.connected()) {
    return;
  }

  testResponsePending = false;
  mqttClient.publish(TOPIC_TEST_RESPONSE, "mega recebeu o comando", false, 1);
}

void publishHeartbeatIfDue() {
  if (!mqttClient.connected()) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastHeartbeatMs < HEARTBEAT_INTERVAL_MS) {
    return;
  }
  lastHeartbeatMs = now;

  char uptimeSeconds[16];
  snprintf(uptimeSeconds, sizeof(uptimeSeconds), "%lu", now / 1000UL);
  mqttClient.publish(TOPIC_UPTIME, uptimeSeconds, false, 0);
}

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    ;
  }

  Serial.println(F("\nMega gateway - diagnostico MQTT"));
  networkReady = startEthernet();
  configureMqtt();

  // Permite a primeira tentativa imediatamente.
  lastMqttAttemptMs = millis() - MQTT_RECONNECT_INTERVAL_MS;
}

void loop() {
  Ethernet.maintain();
  mqttClient.loop();

  connectMqttIfNeeded();
  publishPendingTestResponse();
  publishHeartbeatIfDue();
}

