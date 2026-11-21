# Automacao residencial

![Arquitetura do sistema de automacao residencial](docs/arquitetura-automacao-residencial.png)

## Arquitetura decidida

- Raspberry Pi Model B (256 MB): gateway MQTT local, sem Node.js e sem Docker.
- VPS Hostinger: API Node.js + TypeScript + Fastify, banco de dados, MQTT externo e HTTPS.
- Aplicativo: React Native com Expo.
- Arduino Mega: controlador central e autonomo.
- Arduino Uno: modulo remoto ligado ao Mega por RS-485.
- Ethernet Shield: W5100 ligado ao Mega.
- Nenhuma porta aberta nos roteadores residenciais.
- Automacoes essenciais continuam funcionando sem Raspberry, VPS ou internet.
- Comandos remotos nunca podem ultrapassar os limites de seguranca gravados no firmware do Mega.

## Rede local de automacao

- Roteador interno: D-Link DI-524 (`192.168.0.1`).
- Raspberry Pi / Mosquitto local: `192.168.0.10:1883`.
- Mega/W5100: endereco obtido por DHCP; inicia conexoes para a Raspberry.
- A futura ponte MQTT sera iniciada pela Raspberry em direcao a VPS usando TLS.

## Estado atual

- Mosquitto local instalado e ativo.
- Autenticacao MQTT habilitada.
- Usuario MQTT do Mega criado.
- IP da Raspberry reservado no DI-524.
- Proxima etapa: validar Mega + W5100 + MQTT sem conectar atuadores.

## Marco validado

- Comunicacao bidirecional Raspberry/Mosquitto/W5100/Mega validada.
- DNS da API e do MQTT externo apontando para a VPS.
- Stack isolado da VPS preparado em `deploy/` e `services/api/`.

