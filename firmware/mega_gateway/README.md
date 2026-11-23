# Diagnostico Mega + W5100 + MQTT

Este sketch valida a comunicacao entre o Arduino Mega, o Ethernet Shield W5100 e o
Mosquitto local. Ele tambem valida o protocolo dos comandos de irrigacao, agua e
racao, mas ainda nao controla relés, bombas, valvulas ou alimentadores.

`ACTUATORS_CONFIGURED` permanece `false`. Os comandos validos recebem a resposta
`rejected|hardware_unconfigured`, e nenhum pino de saida e configurado ou acionado.

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

