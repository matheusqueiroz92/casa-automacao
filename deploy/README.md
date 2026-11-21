# Deploy da automacao residencial

Este stack e isolado dos outros projetos da VPS. Ele nao publica portas diretamente:

- API: roteada pelo Traefik para `casa-api.matheusqueiroz.dev.br`;
- MQTT: roteado com TLS/SNI pelo Traefik para `casa-mqtt.matheusqueiroz.dev.br`;
- PostgreSQL: acessivel apenas na rede Docker interna;
- Mosquitto interno: acessivel apenas pela API e pelo Traefik.

## Segredos que nao devem ser versionados

- `.env`;
- `mosquitto/config/passwords`.

Copie `.env.example` para `.env` e substitua todos os valores de exemplo por
segredos diferentes. As senhas do PostgreSQL, MQTT e API devem ser independentes.

O arquivo `passwords` do Mosquitto deve conter dois usuarios:

- `gateway-casa`: usado exclusivamente pela ponte da Raspberry;
- `api-casa`: usado exclusivamente pela API.

No Docker Desktop para Windows, o arquivo criado por `mosquitto_passwd` pode ficar
com permissao `0600` pertencente a `root`. Para o teste local, ajuste-o para `0644`;
o Mosquitto 2.1 emitira avisos, mas conseguira le-lo.

Na VPS Linux, os arquivos `passwords` e `acl` devem pertencer a `1883:1883` e usar
permissao `0700`, conforme a verificacao de seguranca do Mosquitto 2.1.

As ACLs impedem que a API publique telemetria e impedem que o gateway publique
comandos. Esta primeira versao da API expoe somente um comando de diagnostico.

## Teste local

O arquivo `docker-compose.local.yml` publica somente no loopback do computador:

- API: `127.0.0.1:3000`;
- MQTT: `127.0.0.1:1883`;
- PostgreSQL: nao e publicado no host.

Ele nao depende do Traefik e usa volumes diferentes dos volumes de producao.

Ao testar o comando de diagnostico com PowerShell, envie um objeto JSON vazio:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/v1/devices/mega/commands/test `
  -Headers @{ "x-api-key" = $ApiKey } `
  -ContentType "application/json" `
  -Body "{}"
```

