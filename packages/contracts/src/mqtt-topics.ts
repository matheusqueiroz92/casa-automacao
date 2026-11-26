export const MQTT_TOPICS = {
  mega: {
    status: 'casa/mega/status',
    event: 'casa/mega/evento/#',
    telemetry: 'casa/mega/telemetria/#',
    presence: 'casa/mega/telemetria/presenca',
    ultrasonicDistance: 'casa/mega/telemetria/distancia_mm',
    command: {
      feeding: 'casa/mega/comando/racao',
      irrigation: 'casa/mega/comando/irrigacao',
      relayTest: 'casa/mega/comando/rele/1',
      relayTest2: 'casa/mega/comando/rele/2',
      relayTest3: 'casa/mega/comando/rele/3',
      test: 'casa/mega/comando/teste',
      waterRefill: 'casa/mega/comando/agua',
    },
  },
} as const;

export const PRESENCE_STATES = ['warming_up', 'detected', 'clear'] as const;
export type PresenceState = (typeof PRESENCE_STATES)[number];
