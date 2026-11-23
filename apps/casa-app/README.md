# Casa Automação — aplicativo universal

Aplicativo React Native com Expo para iOS, Android e Web. A interface reutiliza a identidade visual de `matheusqueiroz.dev.br` e foi desenhada para operação segura da automação residencial.

## Requisitos

- Node.js LTS
- npm
- Expo Go no celular, caso deseje testar em um dispositivo físico

## Desenvolvimento

```bash
npm run dev
```

O comando deve ser executado na raiz do monorepo. Ele inicia PostgreSQL,
Mosquitto, API e Expo. A API fica em `http://127.0.0.1:3001` e o Metro em
`http://127.0.0.1:8081`.

Para testar em um dispositivo físico, informe o IPv4 do computador antes de
iniciar o ambiente:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.0.100:3001"
npm run dev
```

## Estado atual

- Expo SDK 58, React Native e TypeScript.
- Roteamento com Expo Router.
- Temas claro e escuro baseados no site pessoal.
- Dashboard responsivo para mobile e web.
- Estado do Mega e diagnóstico conectados à API local real.
- Login e logout reais com Better Auth e sessão no Expo SecureStore.
- Cliente HTTP compartilhado com validação dos contratos.
- Irrigacao, agua e racao publicam comandos reais na API e no MQTT, com limites
  redundantes no app, servidor e firmware.
- O firmware permanece em modo protegido e rejeita a execucao fisica enquanto
  relés, sensores e pinos nao forem definidos.
- Nenhum segredo compartilhado é incluído no aplicativo.

## Próximas integrações

1. Definir o esquema eletrico, pinos, relés, sensores e fail-safes dos atuadores.
2. Substituir estados demonstrativos por telemetria real.
3. Adicionar atualização em tempo real por WebSocket ou SSE.
4. Adicionar recuperação de senha por e-mail antes do uso público.
