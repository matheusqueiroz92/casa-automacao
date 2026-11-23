# ADR 0001 — Turborepo e Clean Architecture pragmática

- Status: aceito
- Data: 2026-11-22
- Decisores: Matheus Queiroz e equipe do projeto

## Contexto

O sistema reúne API, aplicativo universal, contratos compartilhados, firmware e
infraestrutura. API e interfaces precisam evoluir juntas sem duplicar tópicos
MQTT, formatos HTTP ou regras de negócio. A segurança física continua sendo
responsabilidade soberana do firmware do Mega.

## Decisão

Adotamos npm workspaces com Turborepo para coordenar build, lint, testes e
verificação de tipos. Aplicativos ficam em `apps/`; código reutilizável e sem
dependência de produto fica em `packages/`.

A API usa quatro fronteiras:

- `domain`: portas e tipos centrais, sem Fastify, PostgreSQL ou MQTT;
- `application`: casos de uso que orquestram as portas;
- `infrastructure`: adaptadores concretos de banco, broker, relógio e UUID;
- `presentation`: HTTP, autenticação e serialização.

Dependências apontam das bordas para o núcleo e são conectadas apenas em
`server.ts`. Os contratos TypeBox em `@casa/contracts` são a fonte compartilhada
para schemas HTTP, tópicos MQTT e tipos usados pela API e pelo app.
O pacote `@casa/api-client` encapsula HTTP, cabeçalhos de sessão,
tratamento de falhas e validação universal das respostas.

TDD é aplicado onde há comportamento: primeiro um teste falhando, depois a menor
implementação e, por fim, refatoração. SOLID e DRY orientam decisões, mas não
justificam abstrações sem uma necessidade concreta. Clean Architecture aqui é
uma estratégia de limites, não uma multiplicação automática de pastas e classes.

## Consequências

Benefícios:

- contratos divergentes passam a falhar no build ou nos testes;
- casos de uso podem ser testados sem rede, banco ou broker;
- Fastify, MQTT e PostgreSQL podem ser substituídos nas bordas;
- tarefas afetadas podem ser executadas e armazenadas em cache pelo Turborepo.

Custos:

- o Docker precisa construir a partir da raiz do monorepo;
- mudanças em contratos exigem validar todos os consumidores;
- as fronteiras adicionam alguma estrutura mesmo a funcionalidades pequenas.

## Restrições de segurança

Nenhuma regra na API ou no app substitui os limites gravados no Mega. Comandos
remotos são solicitações; o firmware valida duração, quantidade, estado de
sensores e condições de falha antes de acionar qualquer atuador.
