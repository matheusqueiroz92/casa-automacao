# ADR-0002: Neon PostgreSQL e Better Auth

**Status:** Aceito  
**Data:** 2026-11-22  
**Decisor:** Matheus Queiroz

## Contexto

O aplicativo móvel precisa substituir a chave de API compartilhada por autenticação individual, sem expor segredos no bundle Expo. A API continuará hospedada na VPS e deve manter testes locais reproduzíveis.

## Decisão

Usar Neon como PostgreSQL gerenciado em produção e PostgreSQL Docker localmente. A API Fastify hospedará Better Auth 1.7, com e-mail e senha, sessões persistentes, hash Argon2id, cadastro público desativado e integração oficial com Expo SecureStore.

O código depende de uma `DATABASE_URL` PostgreSQL, não de APIs proprietárias do Neon. O primeiro usuário será criado pelo comando administrativo do Better Auth.

## Opções consideradas

### Autenticação própria com JWT e refresh token

**Vantagens:** controle total e poucas abstrações.  
**Desvantagens:** maior superfície de segurança, rotação e revogação próprias, mais código sensível para manter.

### Neon Managed Auth

**Vantagens:** serviço gerenciado e identidade no mesmo banco.  
**Desvantagens:** integração móvel ainda mais nova, maior dependência do provedor e recursos relevantes em evolução.

### Better Auth na API Fastify

**Vantagens:** suporte oficial a Expo, cookies em SecureStore, integração PostgreSQL e portabilidade.  
**Desvantagens:** a VPS continua responsável por executar o serviço de autenticação.

## Consequências

- Nenhuma credencial compartilhada será compilada no aplicativo.
- A API valida uma sessão antes de permitir leitura ou comandos.
- O Neon recebe somente conexões TLS pela URL pooled.
- O ambiente local continua independente do Neon.
- Cadastro público permanece desabilitado para reduzir a superfície de ataque de uma residência privada.
