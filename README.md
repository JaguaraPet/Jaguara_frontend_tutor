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

## Entrar com Google ou Apple (UC-02, RF46)

Em `/entrar`, "Continuar com Google" aparece quando o build tem o ID de cliente OAuth da plataforma (`EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` ou `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`), e "Continuar com Apple" aparece no iPhone (`expo-apple-authentication`). O app gera um nonce novo a cada tentativa (`expo-crypto`) e manda o `id_token` para a API (`src/sessao/BotoesSociais.tsx`). Se o e-mail já tem conta, a tela pede a senha dela para ligar o login; no primeiro acesso, `/cadastro-social` pede CPF, celular opcional e o aceite dos termos e já entra. Os mesmos IDs de cliente do Google entram em `GOOGLE_LOGIN_CLIENT_IDS` na API.

## Linha do tempo (UC-35)

No perfil do pet, "Linha do tempo" abre `/pets/[petId]/linha-do-tempo`: vacinas, exames, medicamentos, compromissos e atendimentos do mais recente ao mais antigo, com ícone e filtro por tipo. Cada item é lido pelo leitor de tela como uma frase só (data, tipo e título).

## Vacinas (UC-12, UC-13)

No perfil do pet, "Vacinas" abre `/pets/[petId]/vacinas`: o histórico válido em ordem de aplicação (RN16), a próxima dose em destaque e o registro (vacina, data, quem aplicou, próxima dose, fabricante, lote e observações). Quem aplicou é obrigatório (RN17) e a data não pode ser futura. Com próxima dose, a API agenda o lembrete às 9h do dia anterior.

## Despesas e relatório (UC-06, UC-07)

No perfil do pet, "Despesas" abre `/pets/[petId]/despesas`: o mês atual e os dois anteriores, o registro com categoria obrigatória (RN10) e o total do mês por categoria. "Baixar relatório em PDF" baixa o arquivo com a sessão (`expo-file-system`) e abre o compartilhamento do sistema (`expo-sharing`) para salvar ou enviar (RN11). Mês sem despesas mostra o aviso e não oferece o PDF (CT-07-02).

## Alimentação (UC-08)

No perfil do pet, "Alimentação" abre `/pets/[petId]/alimentacao`: o plano (alimento, meta e limite diários, refeições por dia), a barra do consumo de hoje e o registro de refeições com hora no fuso de Brasília. Quando a refeição passa do limite, ela é registrada e a tela avisa (RN12, CT-08-02).

## Medicamentos (UC-14)

No perfil do pet, "Medicamentos" abre `/pets/[petId]/medicamentos`: os tratamentos em uso e os anteriores, o cadastro (medicamento, dose, via, intervalo, início, fim opcional e hora da primeira dose) e "Finalizar". Ao salvar, a tela mostra quantos lembretes de dose a API agendou (RN18); ao finalizar, os lembretes futuros são cancelados.

## Exames (UC-36)

No perfil do pet, "Exames" abre `/pets/[petId]/exames`: o histórico com laboratório e resultado e o registro com o laudo escolhido entre os documentos do pet. "Ver laudo" pede a URL assinada e abre o arquivo no aparelho (`src/saude/arquivos.ts`). Sem permissão, a recusa da API aparece na tela (CT-36-02).

## Alergias e restrições (UC-37)

No perfil do pet, "Alergias e restrições" abre `/pets/{id}/alergias`: a lista com tipo, gravidade e observações, as graves marcadas como "Em destaque no perfil" (CT-37-01). O tutor registra, altera e exclui depois de confirmar; a data de identificação é opcional e não pode ser futura. A recusa da API (por exemplo, sem permissão para dados clínicos, CT-37-02) aparece na tela.

## Documentos (UC-34)

No perfil do pet, "Documentos" abre `/pets/[petId]/documentos`: o tutor escolhe um PDF ou foto (até 10 MB, `expo-document-picker`), dá título e tipo e envia. A API registra e devolve a URL assinada; o arquivo vai do aparelho direto para o armazenamento (`src/saude/envio.ts`), e se esse envio falhar o registro é desfeito. "Abrir" baixa pela URL assinada e "Excluir" pede confirmação.

## Responsáveis pelo pet (UC-05)

No perfil do pet, "Responsáveis" abre `/pets/[petId]/responsaveis`. O responsável principal adiciona outro tutor pelo e-mail da conta (adicional ou principal), troca o tipo e remove vínculos; o adicional só pode sair. A API garante que o pet nunca fique sem principal (RN09) e a tela mostra a recusa.

## Memorial (UC-15)

No perfil do pet, "Memorial" abre `/pets/[petId]/memorial`. Para pet ativo, a tela explica e oferece "Registrar falecimento", com confirmação. Depois, mostra a mensagem do memorial, as lembranças e homenagens e as fotos, enviadas direto ao armazenamento pela URL assinada (RN19).

## Compartilhar perfil (UC-11)

No perfil do pet, "Compartilhar perfil" abre `/pets/[petId]/compartilhar`: com uma empresa encontrada na busca ou com uma pessoa por e-mail, escolhendo o que mostrar (perfil básico, vacinas, alergias, medicamentos, exames, documentos, linha do tempo e, só para empresa, registrar na saúde) e por quanto tempo. Por e-mail, a pessoa recebe um link de leitura, que aparece uma vez e pode ser enviado pelo compartilhamento do sistema. A lista mostra a situação de cada compartilhamento e permite revogar na hora (RN15).

## Recuperação de senha (UC-03)

No login, "Esqueci minha senha" abre `/recuperar-senha`, que pede o e-mail e mostra sempre a mesma resposta, exista a conta ou não. O link do e-mail abre a página da web; no celular, o mesmo link no formato `jaguara://redefinir-senha?token=...` abre `/redefinir-senha` no app. A nova senha segue a política e não pode repetir as três últimas (RN06); link vencido ou já usado mostra como pedir outro (RN05).

## Cadastro e edição do pet (UC-04)

Na aba Pets, "Cadastrar pet" abre `/pets/novo`; a edição fica em `/pets/[petId]/editar`. O formulário (`src/pets/FormularioPet.tsx`) traz espécies e raças do catálogo (`GET /especies`, RN07), sexo, data de nascimento com máscara DD/MM/AAAA, peso, cor, microchip e castração, e valida no aparelho antes de enviar, dizendo o que corrigir. Quem cadastra fica como responsável principal (RN09).

## Lista de pets (UC-04)

A aba Pets lista os pets do tutor com foto (ou a inicial do nome), espécie, raça e idade, e filtra por ativos, arquivados e memorial. Tocar no pet abre o perfil (`/pets/{id}`); "Cadastrar pet" abre `/pets/novo`. A lista é buscada de novo ao voltar para a aba.

## Perfil do pet (UC-04)

`/pets/[petId]` mostra os dados do pet, as alergias e restrições (as graves no topo, em destaque e anunciadas pelo leitor de tela, UC-37) e as últimas vacinas com a próxima dose. "Editar dados" abre a edição, e a edição tem o atalho "Ver perfil do pet". Pet arquivado ou falecido mostra o aviso e não oferece edição.

## Solicitar agendamento (UC-40)

Na tela da empresa, cada serviço tem "Solicitar agendamento", que abre `/solicitar/[servicoId]`: o tutor escolhe o pet, um dos próximos 14 dias e um horário livre (`GET /servicos/{id}/horarios-disponiveis`, no fuso de Brasília) e pode deixar observações. A solicitação fica pendente até a empresa responder (RN38). Se o horário for ocupado enquanto o tutor escolhe, a API responde 409, o app avisa e busca os horários de novo (CT-40-02).

## Minhas solicitações (UC-42)

No Início, "Minhas solicitações" abre `/solicitacoes`: as em andamento (ou todas), com serviço, pet, empresa, horário e status. O detalhe (`/solicitacoes/[id]`) mostra o valor contratado, o motivo da recusa, o histórico com o autor de cada mudança, "Pagar" quando a solicitação foi aceita e ainda não foi paga, e "Cancelar solicitação" antes do horário, com confirmação (RN38).

## Pagamento de agendamento (UC-44)

`/pagar/[agendamentoId]` (com `servico` e `valor` nos parâmetros) paga pelo preço contratado (RN27) com PIX ou cartão. O PIX mostra o código copia e cola e a tela confere a cada 5 segundos até o banco confirmar. No cartão, os dados vão direto para o gateway e a API recebe só o token e a bandeira (`src/pagamento/cartao.ts`); recusa mostra o motivo e "Tentar outro meio" (RN39). Com `EXPO_PUBLIC_MP_CHAVE_PUBLICA` no `.env` o token vem do Mercado Pago (sandbox: cartão 5031 4332 1540 6351, titular APRO aprova e OTHE recusa); sem ela, o app gera um token de teste para o gateway simulado da API, e o titular OTHE também simula a recusa. A tela é aberta pelo botão "Pagar" do detalhe em "Minhas solicitações".

## Chat com a empresa (UC-43)

Na tela da empresa, "Conversar com a empresa" abre `/chat/[empresaId]`, que inicia (ou retoma) a conversa com `POST /conversas` e mostra o histórico em ordem. Com a tela aberta, o app busca mensagens novas a cada 5 segundos (a web da empresa recebe em tempo real pelo Socket.IO). Só quem é cliente ou tem agendamento com a empresa conversa; os demais veem o aviso da API (CT-43-01).

## Agenda e eventos (UC-10)

A aba Agenda mostra os próximos 30 dias do pet escolhido, agrupados por dia, com os eventos do tutor e os agendamentos com empresas (só os eventos manuais podem ser excluídos, e o lembrete sai junto). "Novo evento" abre `/eventos/novo`: título, tipo, data DD/MM/AAAA, início e fim HH:MM no fuso de Brasília, local e observações; conflito de horário do pet volta como aviso (RN14), e a API agenda o lembrete uma hora antes (RN37). O componente `Opcoes` (escolha única acessível) fica em `src/componentes`.

## Notificações push (UC-31)

Na aba Perfil, "Notificações" abre `/notificacoes`: os próximos lembretes e os avisos recebidos e, em "Preferências", para cada tipo de compromisso, se recebe, o canal (celular ou e-mail) e a antecedência (RN37). A preferência salva na hora e volta ao valor anterior se a API recusar.

Com a sessão aberta, o app pede a permissão e registra o aparelho na API (`src/notificacoes/push.ts`, `expo-notifications`); ao sair, tira o aparelho da conta. O token de push exige o projeto do EAS (`extra.eas.projectId`, criado no build da JAG-212) e um aparelho de verdade: no emulador ou sem o projeto, o app não registra e as notificações continuam na lista.

## Meus pagamentos (UC-45)

Na aba Perfil, "Pagamentos" abre `/pagamentos`: o histórico com valor, data, meio, situação e filtro (pagos, aguardando, recusados), com "Limpar filtro" quando nada aparece. Pagamento confirmado há até 30 dias tem "Pedir reembolso", com motivo; a recusa da API aparece na tela (RN39).

## Privacidade (UC-46)

Na aba Perfil, "Privacidade" abre `/privacidade`: os termos aceitos com versão e data, com a chave para revogar os opcionais (auditada na API). O termo obrigatório não sai: a API devolve 409 e a tela explica que só a exclusão da conta encerra o aceite. "Exportar meus dados" baixa o JSON da API e abre o compartilhamento do aparelho (`expo-file-system`, `expo-sharing`). "Quero excluir minha conta" pede a senha; a exclusão é imediata, anonimiza a conta e volta para as boas-vindas.

Quando sai versão nova de um termo obrigatório (RN42), as abas mandam o tutor para `/termos-pendentes` antes das demais telas: ele lê o texto vigente e aceita, ou sai da conta.

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
