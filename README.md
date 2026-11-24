# Jaguara · App do tutor

App mobile do tutor, em React Native com Expo e Expo Router (ADR-007).


Novo no projeto? O [guia do ambiente de desenvolvimento (ENT-05)](https://github.com/JaguaraPet/Jaguara_doc/blob/main/docs/07-entrega/ENT-05-guia-do-ambiente.md) mostra como subir API, web e app juntos, do zero.

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
    (abas)/     abas do tutor logado: Início, Pets, Agenda, Serviços e Perfil
  sessao/       sessão do tutor (tokens e usuário logado)
  componentes/  componentes de interface
  tema/         tokens do UX-02
  api/          cliente da API
  hooks/        hooks compartilhados
```

## Navegação e sessão

As abas Início, Pets, Agenda, Serviços e Perfil (UX-01, seção 3) ficam em `src/app/(abas)` e exigem login: sem sessão, o app abre as boas-vindas, com os botões Entrar e Criar conta. O access token fica só em memória e o refresh token no armazenamento seguro do aparelho (`expo-secure-store`). Ao abrir o app, a sessão é restaurada pelo refresh token, e o cliente da API renova o token e repete a requisição quando recebe 401. Só contas de tutor entram no app; empresas usam a web Enterprise.

A tela Entrar (`src/app/entrar.tsx`, UC-02) pede e-mail e senha e explica cada recusa da API: senha incorreta, conta bloqueada por tentativas (RN03), e-mail não confirmado (RN02) e conta de empresa.

## Criar conta (UC-01)

`/cadastro` pede nome completo, CPF, e-mail, celular opcional e senha (8+ caracteres, letras e números), mostra os termos de uso e a política de privacidade vigentes (abrem ao tocar) e só envia com o aceite marcado (RN42). CPF e senha são conferidos no aparelho antes de enviar (`src/sessao/cadastro.ts`); CPF ou e-mail repetidos voltam como aviso da API (RN01). Depois do cadastro, a tela pede para confirmar o e-mail pelo link (RN02).

## Medicamentos (UC-14)

No perfil do pet, "Medicamentos" abre `/pets/[petId]/medicamentos`: os tratamentos em uso e os anteriores, o cadastro (medicamento, dose, via, intervalo, início, fim opcional e hora da primeira dose) e "Finalizar". Ao salvar, a tela mostra quantos lembretes de dose a API agendou (RN18); ao finalizar, os lembretes futuros são cancelados.

## Responsáveis pelo pet (UC-05)

No perfil do pet, "Responsáveis" abre `/pets/[petId]/responsaveis`. O responsável principal adiciona outro tutor pelo e-mail da conta (adicional ou principal), troca o tipo e remove vínculos; o adicional só pode sair. A API garante que o pet nunca fique sem principal (RN09) e a tela mostra a recusa.

## Recuperação de senha (UC-03)

No login, "Esqueci minha senha" abre `/recuperar-senha`, que pede o e-mail e mostra sempre a mesma resposta, exista a conta ou não. O link do e-mail abre a página da web; no celular, o mesmo link no formato `jaguara://redefinir-senha?token=...` abre `/redefinir-senha` no app. A nova senha segue a política e não pode repetir as três últimas (RN06); link vencido ou já usado mostra como pedir outro (RN05).

## Cadastro e edição do pet (UC-04)

Na aba Pets, "Cadastrar pet" abre `/pets/novo`; a edição fica em `/pets/[petId]/editar`. O formulário (`src/pets/FormularioPet.tsx`) traz espécies e raças do catálogo (`GET /especies`, RN07), sexo, data de nascimento com máscara DD/MM/AAAA, peso, cor, microchip e castração, e valida no aparelho antes de enviar, dizendo o que corrigir. Quem cadastra fica como responsável principal (RN09).

## Perfil do pet (UC-04)

`/pets/[petId]` mostra os dados do pet, as alergias e restrições (as graves no topo, em destaque e anunciadas pelo leitor de tela, UC-37) e as últimas vacinas com a próxima dose. "Editar dados" abre a edição, e a edição tem o atalho "Ver perfil do pet". Pet arquivado ou falecido mostra o aviso e não oferece edição.

## Solicitar agendamento (UC-40)

Na tela da empresa, cada serviço tem "Solicitar agendamento", que abre `/solicitar/[servicoId]`: o tutor escolhe o pet, um dos próximos 14 dias e um horário livre (`GET /servicos/{id}/horarios-disponiveis`, no fuso de Brasília) e pode deixar observações. A solicitação fica pendente até a empresa responder (RN38). Se o horário for ocupado enquanto o tutor escolhe, a API responde 409, o app avisa e busca os horários de novo (CT-40-02).

## Pagamento de agendamento (UC-44)

`/pagar/[agendamentoId]` (com `servico` e `valor` nos parâmetros) paga pelo preço contratado (RN27) com PIX ou cartão. O PIX mostra o código copia e cola e a tela confere a cada 5 segundos até o banco confirmar. No cartão, os dados vão direto para o gateway e a API recebe só o token e a bandeira (`src/pagamento/cartao.ts`); recusa mostra o motivo e "Tentar outro meio" (RN39). Com `EXPO_PUBLIC_MP_CHAVE_PUBLICA` no `.env` o token vem do Mercado Pago (sandbox: cartão 5031 4332 1540 6351, titular APRO aprova e OTHE recusa); sem ela, o app gera um token de teste para o gateway simulado da API, e o titular OTHE também simula a recusa. A tela é aberta por "Minhas solicitações" (UC-42), que chega em outra entrega.

## Chat com a empresa (UC-43)

Na tela da empresa, "Conversar com a empresa" abre `/chat/[empresaId]`, que inicia (ou retoma) a conversa com `POST /conversas` e mostra o histórico em ordem. Com a tela aberta, o app busca mensagens novas a cada 5 segundos (a web da empresa recebe em tempo real pelo Socket.IO). Só quem é cliente ou tem agendamento com a empresa conversa; os demais veem o aviso da API (CT-43-01).

## Agenda e eventos (UC-10)

A aba Agenda mostra os próximos 30 dias do pet escolhido, agrupados por dia, com os eventos do tutor e os agendamentos com empresas (só os eventos manuais podem ser excluídos, e o lembrete sai junto). "Novo evento" abre `/eventos/novo`: título, tipo, data DD/MM/AAAA, início e fim HH:MM no fuso de Brasília, local e observações; conflito de horário do pet volta como aviso (RN14), e a API agenda o lembrete uma hora antes (RN37). O componente `Opcoes` (escolha única acessível) fica em `src/componentes`.

## Plano PANTERA e assistente virtual (UC-43)

`/pantera` (no Perfil) mostra o preço e os benefícios e assina com PIX: cria a assinatura pendente, gera o código copia e cola e ativa quando o banco confirma (RN39). `/assistente` (no Início) abre a conversa; sem o plano, oferece a assinatura (CT-43-02). A resposta do assistente chega alguns segundos depois do envio, e a tela consulta de novo até ela aparecer.

## Busca de empresas e catálogo (UC-33)

A aba Serviços busca empresas com serviços ativos pelo nome ou por um serviço (`GET /empresas`) e filtra por categoria. Tocar numa empresa abre `/empresa/[empresaId]`, com o perfil público e o catálogo: nome, descrição, preço e duração de cada serviço ativo. Os rótulos e formatos ficam em `src/catalogo/catalogo.ts`.

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

## Problemas comuns

| Sintoma | Solução |
|---|---|
| O app no celular não acessa a API | Use o IP do computador em `EXPO_PUBLIC_API_URL` (arquivo `.env`) e a mesma rede Wi-Fi |
| O Expo Go não abre o projeto | Celular e computador precisam estar na mesma rede; tente `npx expo start --tunnel` |
| CI falha em "Cliente da API igual ao contrato" | Rode `npm run api:gerar` e versione o `src/api/esquema.ts` |

## Dependências

- Gerenciador: **npm** (versão 11 ou maior), com o `package-lock.json` versionado. Instale com `npm ci` para reproduzir exatamente as versões do lock.
- Node.js **24 LTS**, fixado no `.nvmrc` (`nvm use`). O `engine-strict` do `.npmrc` recusa versões abaixo disso.
- Atualizações: o Dependabot abre pull requests semanais para pacotes npm (correções e versões menores agrupadas) e mensais para as actions do GitHub.

## Integração e entrega contínuas

- **CI** (`.github/workflows/ci.yml`): em todo pull request, roda lint, verificação de tipos, testes e build, além da auditoria das dependências de produção. O pull request só entra com o CI verde (ADR-008).
- **Builds do app**: feitos pelo Expo EAS (JAG-212), fora do CI.
