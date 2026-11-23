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
const char TOPIC_IRRIGATION_COMMAND[] = "casa/mega/comando/irrigacao";
const char TOPIC_WATER_COMMAND[] = "casa/mega/comando/agua";
const char TOPIC_FEEDING_COMMAND[] = "casa/mega/comando/racao";
const char TOPIC_AUTOMATION_RESPONSE[] = "casa/mega/evento/comando";
const char TOPIC_UPTIME[] = "casa/mega/telemetria/uptime";

// Limites soberanos do firmware. A API e o app usam os mesmos valores,
// mas somente estas constantes determinam o que o Mega aceitaria executar.
const uint16_t MAX_IRRIGATION_SECONDS = 45;
const uint16_t MAX_WATER_SECONDS = 30;
const uint16_t MAX_FEEDING_GRAMS = 120;

// Permanece falso ate que relés, sensores, pinos e fail-safes sejam definidos
// e validados fisicamente. Este sketch nunca energiza uma saída.
const bool ACTUATORS_CONFIGURED = false;

const unsigned long MQTT_RECONNECT_INTERVAL_MS = 5000UL;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000UL;

EthernetClient ethernetClient;
MQTTClient mqttClient(256);

bool networkReady = false;
bool testResponsePending = false;
bool automationResponsePending = false;
String automationResponsePayload;
unsigned long lastMqttAttemptMs = 0;
unsigned long lastHeartbeatMs = 0;

void printIp(const char *label, IPAddress address) {
  Serial.print(label);
  Serial.println(address);
}

bool containsOnlyDigits(const String &value) {
  if (value.length() == 0) {
    return false;
  }

  for (unsigned int index = 0; index < value.length(); index++) {
    if (!isDigit(value.charAt(index))) {
      return false;
    }
  }

  return true;
}

void queueAutomationResponse(const String &payload, uint16_t maximumValue) {
  const int separatorIndex = payload.indexOf('|');
  if (separatorIndex <= 0) {
    automationResponsePayload = "unknown|rejected|invalid_payload";
    automationResponsePending = true;
    return;
  }

  const String commandId = payload.substring(0, separatorIndex);
  const String rawValue = payload.substring(separatorIndex + 1);

  if (!containsOnlyDigits(rawValue)) {
    automationResponsePayload = commandId + "|rejected|invalid_payload";
  } else {
    const unsigned long requestedValue = rawValue.toInt();
    if (requestedValue < 1 || requestedValue > maximumValue) {
      automationResponsePayload = commandId + "|rejected|safety_limit";
    } else if (!ACTUATORS_CONFIGURED) {
      automationResponsePayload = commandId + "|rejected|hardware_unconfigured";
    } else {
      // Mesmo que a constante seja alterada por engano, nenhuma saída será
      // acionada até que a implementação física seja adicionada explicitamente.
      automationResponsePayload = commandId + "|rejected|actuator_not_implemented";
    }
  }

  automationResponsePending = true;
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
  } else if (topic == TOPIC_IRRIGATION_COMMAND) {
    queueAutomationResponse(payload, MAX_IRRIGATION_SECONDS);
  } else if (topic == TOPIC_WATER_COMMAND) {
    queueAutomationResponse(payload, MAX_WATER_SECONDS);
  } else if (topic == TOPIC_FEEDING_COMMAND) {
    queueAutomationResponse(payload, MAX_FEEDING_GRAMS);
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
    mqttClient.subscribe(TOPIC_IRRIGATION_COMMAND, 1);
    mqttClient.subscribe(TOPIC_WATER_COMMAND, 1);
    mqttClient.subscribe(TOPIC_FEEDING_COMMAND, 1);
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

void publishPendingAutomationResponse() {
  if (!automationResponsePending || !mqttClient.connected()) {
    return;
  }

  automationResponsePending = false;
  mqttClient.publish(TOPIC_AUTOMATION_RESPONSE, automationResponsePayload, false, 1);
  automationResponsePayload = "";
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
  publishPendingAutomationResponse();
  publishHeartbeatIfDue();
}

