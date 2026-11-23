# Ponte MQTT da Raspberry Pi

A Raspberry inicia uma unica conexao TLS de saida para
`casa-mqtt.matheusqueiroz.dev.br:443`. Nenhuma porta residencial precisa ser
aberta.

O modelo `bridge-vps.conf.example` separa as duas identidades:

- `bridge-casa`: usuario local da Raspberry, com acesso apenas aos topicos que
  atravessam a ponte;
- `gateway-casa`: usuario remoto do Mosquitto na VPS.

O arquivo real `bridge-vps.conf` contem as duas senhas em texto simples porque
essa e a forma suportada pelo Mosquitto para credenciais de bridge. Proteja-o
com proprietario `root:mosquitto` e permissao `0640`; ele esta ignorado pelo
Git.

## Fluxos permitidos

- Entrada: `casa/mega/comando/#`, da VPS para o Mega.
- Saida: status, eventos e telemetria do Mega para a VPS.
- Estado local da ponte: `casa/gateway/ponte/status`.

Os sentidos `in` e `out` sao sempre considerados do ponto de vista do broker
local da Raspberry.
