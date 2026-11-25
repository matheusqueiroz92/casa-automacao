#include <SPI.h>
#include <Ethernet.h>
#include <MQTT.h>
#include "arduino_secrets.h"

// Pinos usados pelo Ethernet Shield W5100 no Arduino Mega.
const uint8_t PIN_SD_CS = 4;
const uint8_t PIN_ETHERNET_CS = 10;
const uint8_t MEGA_SPI_SS_PIN = 53;
const uint8_t PIR_PIN = 25;

struct RelayTestChannel {
  uint8_t pin;
  uint8_t onLevel;
  uint8_t offLevel;
  const char *detail;
};

// Canal 1: modulo RoboCore v2.1 ativo em nivel alto.
// Canais 2 e 3: modulo BTE13-003 ativo em nivel baixo.
const RelayTestChannel RELAY_TEST_CHANNELS[] = {
  {22, HIGH, LOW, "relay_test_1"},
  {23, LOW, HIGH, "relay_test_2"},
  {24, LOW, HIGH, "relay_test_3"},
};
const uint8_t RELAY_TEST_CHANNEL_COUNT =
    sizeof(RELAY_TEST_CHANNELS) / sizeof(RELAY_TEST_CHANNELS[0]);

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
const char TOPIC_RELAY_TEST_COMMAND[] = "casa/mega/comando/rele/1";
const char TOPIC_RELAY_TEST_2_COMMAND[] = "casa/mega/comando/rele/2";
const char TOPIC_RELAY_TEST_3_COMMAND[] = "casa/mega/comando/rele/3";
const char TOPIC_AUTOMATION_RESPONSE[] = "casa/mega/evento/comando";
const char TOPIC_UPTIME[] = "casa/mega/telemetria/uptime";
const char TOPIC_PRESENCE[] = "casa/mega/telemetria/presenca";

// Limites soberanos do firmware. A API e o app usam os mesmos valores,
// mas somente estas constantes determinam o que o Mega aceitaria executar.
const uint16_t MAX_IRRIGATION_SECONDS = 45;
const uint16_t MAX_WATER_SECONDS = 30;
const uint16_t MAX_FEEDING_GRAMS = 120;
const uint16_t MAX_RELAY_TEST_SECONDS = 5;

// Permanece falso ate que os atuadores definitivos, sensores e fail-safes
// sejam validados. O unico acionamento permitido agora e o pulso de bancada
// dedicado, limitado e sem carga nos bornes do rele.
const bool ACTUATORS_CONFIGURED = false;

const unsigned long ETHERNET_RETRY_INTERVAL_MS = 15000UL;
const unsigned long MQTT_RECONNECT_INTERVAL_MS = 5000UL;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000UL;
const unsigned long PIR_WARMUP_MS = 60000UL;
const unsigned long PIR_DEBOUNCE_MS = 250UL;

EthernetClient ethernetClient;
MQTTClient mqttClient(256);

bool networkReady = false;
bool testResponsePending = false;
bool automationResponsePending = false;
String automationResponsePayload;
int8_t activeRelayTestChannel = -1;
unsigned long relayTestDeadlineMs = 0;
String relayTestCommandId;
unsigned long lastEthernetAttemptMs = 0;
unsigned long lastMqttAttemptMs = 0;
unsigned long lastHeartbeatMs = 0;
bool pirReady = false;
bool pirStatePublishPending = false;
uint8_t pirStableState = LOW;
uint8_t pirCandidateState = LOW;
unsigned long pirWarmupStartedMs = 0;
unsigned long pirCandidateSinceMs = 0;

void printIp(const char *label, IPAddress address) {
  Serial.print(label);
  Serial.println(address);
}

void updatePirSensor() {
  const unsigned long now = millis();

  if (!pirReady) {
    if (now - pirWarmupStartedMs < PIR_WARMUP_MS) {
      return;
    }

    pirStableState = digitalRead(PIR_PIN);
    pirCandidateState = pirStableState;
    pirCandidateSinceMs = now;
    pirReady = true;
    pirStatePublishPending = true;

    Serial.print(F("PIR estabilizado: "));
    Serial.println(pirStableState == HIGH ? F("presenca detectada") : F("sem movimento"));
    return;
  }

  const uint8_t currentState = digitalRead(PIR_PIN);
  if (currentState != pirCandidateState) {
    pirCandidateState = currentState;
    pirCandidateSinceMs = now;
    return;
  }

  if (currentState == pirStableState || now - pirCandidateSinceMs < PIR_DEBOUNCE_MS) {
    return;
  }

  pirStableState = currentState;
  pirStatePublishPending = true;

  Serial.print(F("PIR: "));
  Serial.println(pirStableState == HIGH ? F("presenca detectada") : F("ambiente sem movimento"));
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

void queueRelayTestResponse(const String &commandId, const char *status, const char *detail) {
  automationResponsePayload = commandId + "|" + status + "|" + detail;
  automationResponsePending = true;
}

void startRelayTest(const String &payload, uint8_t channelIndex) {
  if (channelIndex >= RELAY_TEST_CHANNEL_COUNT) {
    queueRelayTestResponse("unknown", "rejected", "invalid_channel");
    return;
  }

  const int separatorIndex = payload.indexOf('|');
  if (separatorIndex <= 0) {
    queueRelayTestResponse("unknown", "rejected", "invalid_payload");
    return;
  }

  const String commandId = payload.substring(0, separatorIndex);
  const String rawDurationSeconds = payload.substring(separatorIndex + 1);

  if (!containsOnlyDigits(rawDurationSeconds)) {
    queueRelayTestResponse(commandId, "rejected", "invalid_payload");
    return;
  }

  const unsigned long durationSeconds = rawDurationSeconds.toInt();
  if (durationSeconds < 1 || durationSeconds > MAX_RELAY_TEST_SECONDS) {
    queueRelayTestResponse(commandId, "rejected", "safety_limit");
    return;
  }

  if (activeRelayTestChannel >= 0) {
    queueRelayTestResponse(commandId, "rejected", "relay_busy");
    return;
  }

  const RelayTestChannel &channel = RELAY_TEST_CHANNELS[channelIndex];
  relayTestCommandId = commandId;
  relayTestDeadlineMs = millis() + (durationSeconds * 1000UL);
  activeRelayTestChannel = channelIndex;
  digitalWrite(channel.pin, channel.onLevel);

  Serial.print(F("Rele de teste "));
  Serial.print(channelIndex + 1);
  Serial.print(F(" acionado por "));
  Serial.print(durationSeconds);
  Serial.println(F(" segundo(s)."));
  queueRelayTestResponse(commandId, "executing", channel.detail);
}

void updateRelayTest() {
  if (activeRelayTestChannel < 0) {
    return;
  }

  const unsigned long now = millis();
  if ((long)(now - relayTestDeadlineMs) < 0) {
    return;
  }

  const uint8_t channelIndex = (uint8_t)activeRelayTestChannel;
  const RelayTestChannel &channel = RELAY_TEST_CHANNELS[channelIndex];
  digitalWrite(channel.pin, channel.offLevel);
  activeRelayTestChannel = -1;

  Serial.print(F("Rele de teste "));
  Serial.print(channelIndex + 1);
  Serial.println(F(" desligado automaticamente."));
  queueRelayTestResponse(relayTestCommandId, "completed", channel.detail);
  relayTestCommandId = "";
}

void onMqttMessage(String &topic, String &payload) {
  Serial.print(F("MQTT recebido ["));
  Serial.print(topic);
  Serial.print(F("]: "));
  Serial.println(payload);

  // A resposta sera publicada fora do callback para evitar bloqueios na biblioteca.
  if (topic == TOPIC_TEST_COMMAND) {
    testResponsePending = true;
  } else if (topic == TOPIC_IRRIGATION_COMMAND) {
    queueAutomationResponse(payload, MAX_IRRIGATION_SECONDS);
  } else if (topic == TOPIC_WATER_COMMAND) {
    queueAutomationResponse(payload, MAX_WATER_SECONDS);
  } else if (topic == TOPIC_FEEDING_COMMAND) {
    queueAutomationResponse(payload, MAX_FEEDING_GRAMS);
  } else if (topic == TOPIC_RELAY_TEST_COMMAND) {
    startRelayTest(payload, 0);
  } else if (topic == TOPIC_RELAY_TEST_2_COMMAND) {
    startRelayTest(payload, 1);
  } else if (topic == TOPIC_RELAY_TEST_3_COMMAND) {
    startRelayTest(payload, 2);
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

void maintainEthernetConnection() {
  const unsigned long now = millis();

  if (!networkReady) {
    if (now - lastEthernetAttemptMs < ETHERNET_RETRY_INTERVAL_MS) {
      return;
    }

    lastEthernetAttemptMs = now;
    networkReady = startEthernet();

    if (networkReady) {
      Serial.println(F("Rede Ethernet recuperada."));

      // Permite que o MQTT tente reconectar sem aguardar mais cinco segundos.
      lastMqttAttemptMs = millis() - MQTT_RECONNECT_INTERVAL_MS;
    }

    return;
  }

  // Retornos da biblioteca Ethernet:
  // 1 = falha ao renovar; 2 = renovacao concluida;
  // 3 = falha ao refazer o vinculo; 4 = novo vinculo concluido.
  const int dhcpResult = Ethernet.maintain();

  if (dhcpResult == 1 || dhcpResult == 3) {
    Serial.println(F("ERRO: lease DHCP perdido. Tentando recuperar a rede..."));

    mqttClient.disconnect();
    ethernetClient.stop();
    networkReady = false;

    // Agenda a proxima tentativa sem bloquear continuamente o loop principal.
    lastEthernetAttemptMs = millis();
  } else if (dhcpResult == 2 || dhcpResult == 4) {
    Serial.println(F("Lease DHCP renovado."));
    printIp("IP do Mega: ", Ethernet.localIP());
  }
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
    mqttClient.subscribe(TOPIC_RELAY_TEST_COMMAND, 1);
    mqttClient.subscribe(TOPIC_RELAY_TEST_2_COMMAND, 1);
    mqttClient.subscribe(TOPIC_RELAY_TEST_3_COMMAND, 1);
    mqttClient.publish(TOPIC_STATUS, "online", true, 1);

    if (pirReady) {
      pirStatePublishPending = true;
    } else {
      mqttClient.publish(TOPIC_PRESENCE, "warming_up", true, 1);
    }
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

void publishPendingPirState() {
  if (!pirReady || !pirStatePublishPending || !mqttClient.connected()) {
    return;
  }

  pirStatePublishPending = false;
  mqttClient.publish(
      TOPIC_PRESENCE,
      pirStableState == HIGH ? "detected" : "clear",
      true,
      1);
}

void setup() {
  // Define o nivel inativo antes de transformar os pinos em saida. Assim,
  // nenhum dos modulos recebe um pulso acidental durante o boot do Mega.
  for (uint8_t index = 0; index < RELAY_TEST_CHANNEL_COUNT; index++) {
    digitalWrite(RELAY_TEST_CHANNELS[index].pin, RELAY_TEST_CHANNELS[index].offLevel);
    pinMode(RELAY_TEST_CHANNELS[index].pin, OUTPUT);
  }

  pinMode(PIR_PIN, INPUT);
  pirWarmupStartedMs = millis();

  Serial.begin(115200);
  while (!Serial) {
    ;
  }

  Serial.println(F("\nMega gateway - diagnostico MQTT"));
  Serial.println(F("PIR em estabilizacao por 60 segundos."));
  networkReady = startEthernet();
  lastEthernetAttemptMs = millis();
  configureMqtt();

  // Permite a primeira tentativa imediatamente.
  lastMqttAttemptMs = millis() - MQTT_RECONNECT_INTERVAL_MS;
}

void loop() {
  // O desligamento do rele tem prioridade sobre manutencao de rede e MQTT.
  updateRelayTest();
  updatePirSensor();
  maintainEthernetConnection();

  if (networkReady) {
    mqttClient.loop();
  }

  connectMqttIfNeeded();
  publishPendingTestResponse();
  publishPendingAutomationResponse();
  publishHeartbeatIfDue();
  publishPendingPirState();
}
