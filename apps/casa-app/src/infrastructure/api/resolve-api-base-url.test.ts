import { resolveApiBaseUrl } from './resolve-api-base-url';

describe('resolveApiBaseUrl', () => {
  it('usa o mesmo hostname da página no desenvolvimento web', () => {
    expect(
      resolveApiBaseUrl({
        configuredUrl: 'http://192.168.1.67:3001',
        development: true,
        platform: 'web',
        webHostname: 'localhost',
      }),
    ).toBe('http://localhost:3001');
  });

  it('preserva o IP da LAN no aplicativo nativo', () => {
    expect(
      resolveApiBaseUrl({
        configuredUrl: 'http://192.168.1.67:3001',
        development: true,
        platform: 'ios',
        webHostname: undefined,
      }),
    ).toBe('http://192.168.1.67:3001');
  });

  it('preserva a URL HTTPS configurada em produção', () => {
    expect(
      resolveApiBaseUrl({
        configuredUrl: 'https://casa-api.matheusqueiroz.dev.br',
        development: false,
        platform: 'web',
        webHostname: 'casa.matheusqueiroz.dev.br',
      }),
    ).toBe('https://casa-api.matheusqueiroz.dev.br');
  });
});
