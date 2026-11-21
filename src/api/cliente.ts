import createClient from 'openapi-fetch';
import { sessao } from '../sessao/sessao';
import { URL_API } from './config';
import type { paths } from './esquema';

export { URL_API };

/**
 * Cliente tipado gerado do contrato OpenAPI (JAG-95): rotas, parâmetros e respostas
 * vêm de src/api/esquema.ts, sem tipos escritos à mão.
 */
export const api = createClient<paths>({ baseUrl: URL_API });

const repetidas = new WeakSet<Request>();

api.use({
  onRequest({ request }) {
    if (sessao.accessToken) {
      request.headers.set('Authorization', `Bearer ${sessao.accessToken}`);
    }
    return request;
  },
  /** Access token vencido: renova pelo refresh token e repete a requisição uma vez. */
  async onResponse({ request, response }) {
    if (response.status !== 401 || repetidas.has(request) || !sessao.accessToken) {
      return response;
    }
    if (!(await sessao.renovar())) return response;
    const novamente = new Request(request, { headers: new Headers(request.headers) });
    novamente.headers.set('Authorization', `Bearer ${sessao.accessToken}`);
    repetidas.add(novamente);
    return fetch(novamente);
  },
});
