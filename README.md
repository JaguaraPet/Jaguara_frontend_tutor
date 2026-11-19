# Jaguara · App do tutor

App mobile do tutor, em React Native com Expo e Expo Router (ADR-007).

## Rodar

```bash
npm install
npm start
```

Abra no celular com o Expo Go (mesma rede Wi-Fi) ou num emulador.

## Estrutura

```text
src/
  app/          telas e rotas (Expo Router)
  componentes/  componentes de interface
  tema/         tokens do UX-02
  api/          cliente da API
  hooks/        hooks compartilhados
```

## Design e componentes base

Os tokens do UX-02 (cores, tipografia Inter, espaçamento de 4 px, raio de 8 px e área de toque de 44 px) ficam em `src/tema/tokens.ts`, arquivo idêntico ao da web Enterprise. Os componentes base ficam em `src/componentes`:

| Componente | Estados e acessibilidade |
|---|---|
| `Botao` | Variantes primária, secundária, perigo e texto; pressionado, foco, desabilitado e carregando; área mínima de 44 px |
| `Campo` | Rótulo sempre visível, ajuda, foco, desabilitado e erro anunciado pelo leitor de tela |
| `Cartao` | Agrupa informações sobre a cor de superfície; pode ser tocável |
| `Alerta` | Sucesso, alerta, erro e informação, com cor, ícone e texto (a cor nunca é o único indicador) |
| `Texto` | Títulos, corpo e legenda; acompanha a fonte ampliada do sistema |

Em desenvolvimento, a tela inicial tem o atalho "Ver componentes", que abre o catálogo com todos os estados. Os testes (`npm test`) usam Jest com React Testing Library (TST-01).

## Cliente da API

Os tipos do cliente são gerados do contrato OpenAPI do Jaguara_doc (JAG-95), sem tipos escritos à mão:

```bash
npm run api:contrato   # baixa o openapi.yaml da main do Jaguara_doc para api/openapi.yaml
npm run api:gerar      # gera src/api/esquema.ts
```

Use o cliente de `src/api/cliente.ts` (openapi-fetch); o endereço vem de `EXPO_PUBLIC_API_URL` (no celular, use o IP do computador): rotas, parâmetros e respostas são conferidos pelo TypeScript. O CI falha se `src/api/esquema.ts` não estiver igual ao gerado a partir de `api/openapi.yaml`.

## Dependências

- Gerenciador: **npm** (versão 11 ou maior), com o `package-lock.json` versionado. Instale com `npm ci` para reproduzir exatamente as versões do lock.
- Node.js **24 LTS**, fixado no `.nvmrc` (`nvm use`). O `engine-strict` do `.npmrc` recusa versões abaixo disso.
- Atualizações: o Dependabot abre pull requests semanais para pacotes npm (correções e versões menores agrupadas) e mensais para as actions do GitHub.

## Integração e entrega contínuas

- **CI** (`.github/workflows/ci.yml`): em todo pull request, roda lint, verificação de tipos, testes e build, além da auditoria das dependências de produção. O pull request só entra com o CI verde (ADR-008).
- **Builds do app**: feitos pelo Expo EAS (JAG-212), fora do CI.
