# Deploy da automacao residencial

Este stack e isolado dos outros projetos da VPS. Ele nao publica portas diretamente:

- API: roteada pelo Traefik para `casa-api.matheusqueiroz.dev.br`;
- MQTT: roteado com TLS/SNI pelo Traefik para `casa-mqtt.matheusqueiroz.dev.br`;
- PostgreSQL: Neon gerenciado, acessado pela API usando TLS;
- Mosquitto interno: acessivel apenas pela API e pelo Traefik.

A imagem da API usa a raiz do monorepo como contexto para incluir
`apps/api` e os contratos compartilhados em `packages/contracts`.

## Segredos que nao devem ser versionados

- `.env`;
- `mosquitto/config/passwords`.

Copie `.env.example` para `.env` e substitua todos os valores de exemplo por
segredos diferentes. As senhas do Neon, MQTT e o segredo do Better Auth devem
ser independentes.

Em producao, use a connection string pooled fornecida pelo Neon em
`DATABASE_URL`, com `sslmode=require`. Defina `BETTER_AUTH_URL` como
`https://casa-api.matheusqueiroz.dev.br` e limite `AUTH_TRUSTED_ORIGINS` aos
enderecos reais do aplicativo e do frontend web.

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
- PostgreSQL: `127.0.0.1:5433`, usado pela API em hot reload executada no host.

Ele nao depende do Traefik e usa volumes diferentes dos volumes de producao.

As rotas da casa exigem uma sessao Better Auth. Faca login pelo aplicativo; a
chave `x-api-key` nao e mais aceita.

## Ponte da Raspberry

Depois que o broker externo estiver publicado e com TLS valido, use os modelos
em `raspberry/` para configurar a conexao iniciada pela rede residencial. O
arquivo real `bridge-vps.conf` nao deve ser versionado: ele contem a senha do
usuario remoto `gateway-casa` e uma senha separada para o usuario local
`bridge-casa`.

Para preparar o banco local e criar o primeiro administrador:

```powershell
npm run db:migrate --workspace @casa/api
npm run auth:create-admin --workspace @casa/api -- --email seu-email@exemplo.com --name "Matheus Queiroz" --role admin
```

