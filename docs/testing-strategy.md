# Estratégia de testes

## Objetivos

Os testes devem dar retorno rápido durante o desenvolvimento e proteger os
fluxos de maior risco: publicação de comandos, autenticação, persistência de
estado e limites do firmware.

## Pirâmide

1. Testes unitários de contratos, domínio, casos de uso e estados da interface.
2. Testes de integração da API com `Fastify.inject`, sem abrir portas TCP.
3. Testes de integração com PostgreSQL e Mosquitto em Docker.
4. Testes de interface do Expo para interações críticas.
5. Testes ponta a ponta e hardware-in-the-loop antes de conectar atuadores reais.

## Política TDD

Para comportamento novo:

1. escrever um teste que descreva o resultado observável;
2. confirmar que ele falha pelo motivo esperado;
3. implementar o mínimo necessário;
4. executar toda a suíte relacionada;
5. refatorar mantendo os testes verdes.

Correções de defeitos começam por um teste de regressão. Alterações puramente
visuais ou de configuração exigem verificação proporcional ao risco, mesmo
quando um teste automatizado não oferece valor.

## Metas

- 100% dos contratos e regras críticas de segurança cobertos por exemplos;
- pelo menos 90% de branches no domínio e nos casos de uso;
- todas as rotas protegidas testadas para sucesso e autenticação inválida;
- nenhum merge com `npm run check` falhando;
- testes físicos obrigatórios para falha de sensor, desconexão e limite máximo.

Cobertura é um indicador, não uma meta isolada. Um teste deve verificar
comportamento e não detalhes internos da implementação.
