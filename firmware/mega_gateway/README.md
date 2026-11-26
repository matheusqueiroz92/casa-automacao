# Diagnostico Mega + W5100 + MQTT

Este sketch valida a comunicacao entre o Arduino Mega, o Ethernet Shield W5100 e o
Mosquitto local. Ele tambem valida o protocolo dos comandos de irrigacao, agua e
racao e permite pulsos limitados em tres canais de rele de bancada.

`ACTUATORS_CONFIGURED` permanece `false`. Os comandos validos recebem a resposta
`rejected|hardware_unconfigured`. Somente os topicos de teste de rele podem acionar
saidas; bombas, valvulas e alimentadores continuam bloqueados.

## Reles de bancada

Os bornes de potencia devem permanecer vazios durante estes testes.

| Canal | Modulo | Pino Mega | Topico | Nivel ativo | Nivel inativo |
| --- | --- | ---: | --- | --- | --- |
| 1 | RoboCore v2.1 | 22 | `casa/mega/comando/rele/1` | `HIGH` | `LOW` |
| 2 | BTE13-003 IN1 | 23 | `casa/mega/comando/rele/2` | `LOW` | `HIGH` |
| 3 | BTE13-003 IN2 | 24 | `casa/mega/comando/rele/3` | `LOW` | `HIGH` |

O firmware inicializa os tres pinos no nivel inativo antes de configura-los como
saida. Um intertravamento permite somente um rele de bancada ativo por vez. Cada
pulso dura no maximo cinco segundos, mesmo que a API ou o aplicativo solicitem mais.

No BTE13-003, mantenha o jumper `VCC/RVCC` instalado e conecte:

- `GND` ao `GND` do Mega;
- `IN1` ao pino 23;
- `IN2` ao pino 24;
- `VCC` aos 5 V do Mega.

## Sensor PIR

O sensor PIR usa o pino digital 25 do Mega:

- `VCC` aos 5 V do Mega;
- `OUT` ao pino 25;
- `GND` ao `GND` do Mega.

Durante os primeiros 60 segundos o firmware ignora leituras e publica
`warming_up` em `casa/mega/telemetria/presenca`. Depois da estabilizacao, publica
`detected` ou `clear` com retencao e QoS 1. Uma mudanca precisa permanecer estavel
por 250 ms. A leitura do PIR nao aciona relés ou outros atuadores.

## Sensor ultrassonico HC-SR04

O sensor usa dois pinos digitais do Mega:

- `VCC` aos 5 V do Mega;
- `TRIG` ao pino 26;
- `ECHO` ao pino 27;
- `GND` ao `GND` do Mega.

O firmware mede a distancia a cada 2 segundos e publica o valor inteiro em
milimetros, com retencao e QoS 1, no topico
`casa/mega/telemetria/distancia_mm`. Leituras validas ficam entre 20 e 4000 mm.
Quando nao ha eco confiavel, o payload publicado e `unavailable`.

Uma nova leitura e publicada quando a distancia muda pelo menos 10 mm, quando a
validade muda ou a cada 30 segundos. Esta telemetria nao aciona relés nem outros
atuadores. A conversao em percentual de reservatorio deve ser feita somente
depois da calibracao com as dimensoes reais do recipiente.

## Bibliotecas

Use a biblioteca `Ethernet` que acompanha o Arduino IDE. Ela suporta o W5100 original.
Nao instale `Ethernet2` (W5500), `Ethernet3` ou `Ethernet_Generic` para este teste.

Instale pelo Library Manager do Arduino IDE apenas:

- `MQTT`, de Joel Gaehwiler/256dpi.

`SPI` ja acompanha o core do Arduino AVR.

## Credencial local

1. Copie `arduino_secrets.example.h` para `arduino_secrets.h` na mesma pasta do sketch.
2. Mantenha o usuario `mega`.
3. Substitua a senha de exemplo pela senha cadastrada no Mosquitto.
4. Nao compartilhe nem versione `arduino_secrets.h`.

## Upload

No Arduino IDE, selecione:

- Board: `Arduino Mega or Mega 2560`;
- Processor: `ATmega2560 (Mega 2560)`;
- a porta serial correspondente ao Mega.

Abra `mega_gateway.ino`, compile e envie. Depois abra o Serial Monitor em 115200 baud.

O resultado esperado inclui um IP `192.168.0.x` e a mensagem de conexao ao Mosquitto.

## Teste pela Raspberry

Carregue a senha sem gravá-la no historico:

```bash
IFS= read -r -s -p "Senha MQTT: " MQTT_PASS
echo
```

Observe os topicos do Mega:

```bash
mosquitto_sub -h 127.0.0.1 -u mega -P "$MQTT_PASS" -t 'casa/mega/#' -v
```

Em outro terminal da Raspberry, carregue a mesma variavel e envie:

```bash
mosquitto_pub -h 127.0.0.1 -u mega -P "$MQTT_PASS" -t casa/mega/comando/teste -m ping
```

O assinante deve receber:

```text
casa/mega/evento/teste mega recebeu o comando
```

## Teste seguro dos comandos de automacao

O payload usa o formato `commandId|valor`. Os limites gravados no Mega sao:

- irrigacao: ate 45 segundos;
- enchimento de agua: ate 30 segundos;
- racao: ate 120 gramas.
- rele de bancada: ate 5 segundos, com apenas um canal ativo por vez.

Exemplo de teste dentro do limite:

```bash
mosquitto_pub -h 127.0.0.1 -u mega -P "$MQTT_PASS" \
  -t casa/mega/comando/irrigacao -m 'teste-manual|15'
```

Resposta esperada enquanto o hardware nao estiver configurado:

```text
casa/mega/evento/comando teste-manual|rejected|hardware_unconfigured
```

Um valor acima do limite, como `teste-manual|46`, deve retornar
`rejected|safety_limit`.

Ao terminar, remova a senha da variavel nos dois terminais:

```bash
unset MQTT_PASS
```

