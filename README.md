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

## Dependências

- Gerenciador: **npm** (versão 11 ou maior), com o `package-lock.json` versionado. Instale com `npm ci` para reproduzir exatamente as versões do lock.
- Node.js **24 LTS**, fixado no `.nvmrc` (`nvm use`). O `engine-strict` do `.npmrc` recusa versões abaixo disso.
- Atualizações: o Dependabot abre pull requests semanais para pacotes npm (correções e versões menores agrupadas) e mensais para as actions do GitHub.

## Integração e entrega contínuas

- **CI** (`.github/workflows/ci.yml`): em todo pull request, roda lint, verificação de tipos, testes e build, além da auditoria das dependências de produção. O pull request só entra com o CI verde (ADR-008).
- **Builds do app**: feitos pelo Expo EAS (JAG-212), fora do CI.
