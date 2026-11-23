import type { IncomingHttpHeaders } from 'node:http';
import { fromNodeHeaders } from 'better-auth/node';

import type { HttpAuthGateway } from '../../presentation/http/app.js';
import type { CasaAuth } from './better-auth.js';

export class BetterAuthGateway implements HttpAuthGateway {
  constructor(private readonly auth: CasaAuth) {}

  handle(request: Request): Promise<Response> {
    return this.auth.handler(request);
  }

  getSession(headers: IncomingHttpHeaders) {
    return this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
  }
}
