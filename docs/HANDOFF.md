# Handoff: refatoração visual do GeoMídia

Branch: `feat/refatoracao-visual`, a partir da `main` (`5d13136`). Atualizado em 20/10/2026, à noite.
Status: **pausada, 35 commits, ainda não enviada ao GitHub** (sem push e sem PR). Fora do Git ficou só o painel de teste de variantes (`src/components/dev/VariantLab.vue` e `src/composables/useVariant.ts`), guardado para os próximos testes.

Este arquivo é o ponto de retomada. O plano original está em [`specs/2026-10-19-refatoracao-visual.md`](specs/2026-10-19-refatoracao-visual.md).

## Regra que guiou tudo

Só o frontend mudou. O backend, o contrato da API e a lógica do front ficaram como estavam: `stores/`, `services/api.ts`, `types.ts`, `domain/`, `utils/`, rotas e permissões. Os testes antigos (101) passam em todas as etapas, e entraram 6 testes novos (4 da saudação e 2 da despedida): **107 passando**.

## O que foi feito

1. **Saída do Vuetify.** Agora o front usa Tailwind v4 + shadcn-vue (componentes copiados em `src/components/ui`, editáveis) com ícones `@lucide/vue`. Saíram o Vuetify, o `@mdi/font` e o `src/styles/main.css` (1.459 linhas, 53 `!important`). O JS principal caiu de 121 KB para 85 KB (gzip) nessa etapa; com o menu suspenso, as abas e as animações está hoje em 109 KB.
2. **Identidade PREFCG/SEMADES**, conforme o manual da marca:
   - azul `#283587` e amarelo `#FFCC00`;
   - fonte Onest (substituta aberta da Qanelas);
   - marcas oficiais geradas dos PDFs em `public/brand/`;
   - assinatura visual: traço amarelo inclinado a -12° (`brand-slant`).
3. **As 9 telas refeitas**, com listas empilhadas no celular e erros do servidor exibidos dentro dos diálogos.
4. **Telas grandes divididas em componentes.** O Inventário virou lista + `AssetFormDialog` + `RadiusReassessmentDialog`, e o Mapa ganhou `AssetDetails`.
5. **Logo do GeoMídia**: a logo antiga em PNG foi redesenhada em vetor e virou também o `public/favicon.svg`.
6. **Login**: em 20/10 voltou ao layout da versão anterior (cartão com a foto da cidade no topo, campos com ícone, ENTRAR, fundo claro com rede de pontos), com o símbolo e o nome novos. O fundo animado em canvas saiu.
7. **Entrada no painel ("Pino pousa")**: depois do login o fundo claro continua, o cartão se achata numa linha amarela, o símbolo se monta com a saudação do horário e voa até o logo da faixa.
8. **Faixa institucional com abas**: no computador, faixa azul de ponta a ponta (logo, marcas oficiais, usuário) e abas logo abaixo; Processos e Administração em menus suspensos. O Sair fica no menu do usuário. No celular continua o menu na gaveta lateral.
9. **Saída do painel ("Cidade sai do logo")**: ao confirmar o Sair, a cidade do login se abre em círculo a partir do logo da faixa, aparece "Até logo, Nome" e o cartão do login volta saindo do desfoque.
10. **Movimento**: troca de página "Suave", traço das abas deslizando, números que contam e barras que crescem no Dashboard, linhas de tabela em cascata e botões que afundam ao clicar.
11. **Refinos de 20/10**:
    - na faixa, o usuário aparece só com as iniciais; nome e papel ficam no topo do menu;
    - todas as listas e menus abrem com o "Trilho amarelo" (550 ms, linha amarela correndo no topo);
    - Processos e Administração abrem ao passar o mouse;
    - o cadastro/edição de veículo ganhou topo e botões fixos, índice das partes ao lado e resumo com raio, status e campos em aberto;
    - todos os pop-ups (Dialog) abrem com "Mola + trilho" sobre um véu azul com desfoque. As confirmações (AlertDialog) seguem como antes.

## Decisões fechadas com o usuário

| Item | Escolha | Onde está |
| --- | --- | --- |
| Base de componentes | Tailwind + shadcn-vue | `src/components/ui`, `src/styles/tailwind.css` |
| Direção visual | Institucional moderno | tokens em `src/styles/tailwind.css` |
| Fonte | Onest | `@fontsource-variable/onest` |
| Símbolo | "Lote marcado": pino sobre 3 camadas, a de cima com quadras e o quarteirão sob o pino em destaque | `src/components/brand/geomidia-marks.ts` |
| Nome | "Geo" azul-escuro + "Mídia" azul-claro, formatação "Hierarquia" (nome maior, legenda menor com traço amarelo) | `src/components/brand/GeoMidiaLockup.vue` |
| Layout do login | Cartão da versão anterior (foto da cidade, campos com ícone, ENTRAR) com a marca nova; SEMADES/PREFCG no rodapé | `src/views/LoginView.vue`, `src/components/login/LoginForm.vue` |
| Fundo do login | Imagem clara da versão anterior, presa à tela; o mesmo fundo nas boas-vindas e na saída | `src/components/login/LoginBackground.vue`, `public/login/` |
| Boas-vindas | "Pino pousa": cartão vira linha amarela, símbolo se monta com Bom dia (5h–12h) / Boa tarde (12h–18h) / Boa noite e voa ao logo da faixa | `src/components/welcome/WelcomeOverlay.vue`, `src/composables/useWelcome.ts`, `src/lib/greeting.ts` |
| Saída | "Cidade sai do logo": a cidade do login se abre em círculo a partir do logo da faixa, "Até logo, Nome", e o cartão do login volta saindo do desfoque | `src/components/welcome/FarewellOverlay.vue`, `src/composables/useFarewell.ts` |
| Movimento | Troca de página "Suave" (sai esmaecendo, blocos sobem um a um); traço das abas desliza; números contam e barras crescem no Dashboard; linhas de tabela em cascata; botões afundam ao clicar. Tudo parado com movimento reduzido | `src/styles/motion.css`, `src/components/common/CountUp.vue`, `AppTopNav.vue` |
| Casca do painel | "Faixa institucional" + "Abas com menus" no computador; gaveta lateral no celular | `src/App.vue`, `src/components/layout/AppTopNav.vue`, `nav-items.ts` |
| Usuário na faixa | Só as iniciais; nome e papel no menu | `src/components/layout/AppTopbar.vue` |
| Listas e menus | "Trilho amarelo": painel desce em 550 ms e a linha amarela corre no topo; grupos da barra abrem no hover | `src/styles/motion.css`, `AppTopNav.vue` |
| Cadastro de veículo | "Índice ao lado": topo e botões fixos, índice que acompanha a rolagem, resumo | `src/components/inventory/AssetFormDialog.vue` |
| Pop-ups | "Mola + trilho" sobre véu azul com desfoque | `src/styles/motion.css` |

Todas as animações respeitam `prefers-reduced-motion`. A de boas-vindas pode ser pulada com clique ou Esc. A saída por sessão expirada não anima.

Testadas e descartadas (estão nas páginas de acompanhamento): login dividido ao meio, com a foto azul da cidade ou com o mapa de CG; o fundo animado em canvas do login; menu recolhível, navegação no topo, trilho de ícones e painéis flutuantes. Em 20/10 também: outras 4 formas de mostrar o usuário, 4 animações de lista e 4 disposições e 4 animações do cadastro.

## Mapa do código novo

```
src/components/
  ui/            shadcn-vue (button, input, select, dialog, alert-dialog, table, sheet...)
  brand/         BrandLockup (SEMADES + PREFCG), GeoMidiaMark/Lockup, geomidia-marks.ts (SVG do símbolo)
  layout/        AppTopbar (faixa), AppTopNav (abas), AppSidebar (gaveta do celular), nav-items, PageHeader
  common/        StatusBadge, ToneBadge, EmptyState, SearchInput, TablePager, CountUp
  form/          FormField, FormSection, AttachmentLinksEditor
  inventory/     AssetFormDialog, RadiusReassessmentDialog
  map/           AssetDetails, DetailSection, DetailItem
  expirations/   ExpirationListCard
  login/         LoginForm, LoginBackground (fundo claro preso à tela)
  welcome/       WelcomeOverlay (entrada), FarewellOverlay (saída)
src/composables/useWelcome.ts   liga a entrada; o login chama leave() e play()
src/composables/useFarewell.ts  liga a saída; o App chama leave() e arrive()
src/lib/greeting.ts             saudação por horário e despedida (com testes)
src/lib/tones.ts                cores semânticas dos selos
src/styles/tailwind.css         tokens da marca e base
src/styles/map.css              estilos dos elementos criados pelo Leaflet
src/styles/motion.css           troca de página e detalhes animados
```

## Como rodar de novo

O backend roda em Docker e o front com Vite. Nada disso entra no Git.

1. Postgres/PostGIS: container `geomidia-db` (porta 5432, usuário e senha `geomidia`).
2. API: container `geomidia-api` (imagem `geomidia-back:local`, porta 8000), com variáveis em `geomidia-back/.env.local-docker`. Os dois containers sobem sozinhos com o Docker (`--restart unless-stopped`).
3. Front: `npm run dev -- --port 5180 --strictPort` dentro de `geomidia-front`.
   As portas 3000 e 5173 estão ocupadas pelo projeto AQR da máquina. Por isso o CORS local libera a 5180 (e a 5181, da versão antiga).
4. Login local: `admin` / `admin-geomidia-local`.
5. Conferência: `npm test`, `npx vue-tsc --noEmit` e `npm run build`.

## Pontos de atenção

- **Dados de exemplo no banco local.** Foram criados para ver as telas preenchidas:
  - duas solicitações e uma resposta de exigência marcadas "EXEMPLO LOCAL";
  - datas de vencimento em PROC-2026-101/102;
  - a regra "Empena", que foi excluída por engano num teste e recriada com os mesmos valores (id novo).

  Nada disso vai para produção.
- **Versão antiga para comparar.** A `main` está num worktree em `../geomidia-front-antigo`, servida na 5181. Para remover: `git worktree remove ../geomidia-front-antigo`.
- **Imagens e marcas.** As marcas PREFCG/SEMADES saíram dos PDFs oficiais e não podem ser alteradas (o manual proíbe). A foto antiga do login e a logo PNG antiga foram removidas.
- **Dono do repositório.** O repo é do ViniciusADCG. Vale ele revisar a troca do Vuetify e o redesenho da logo antes do merge.

## Próximos passos sugeridos

0. **Onde paramos (20/10):** o usuário quer brincar com variações da tela de login. Depois, falta o segundo pop-up (provavelmente o painel Análise/Cadastro do mapa). Para oferecer variantes, usar o painel de teste no próprio site (`VariantLab` + `useVariant`), sem gravar vídeos.

1. Revisar com o Vinicius e decidir o destino do PR (`dev` ou `main`).
2. Testar em celular de verdade, em especial o mapa e as animações de entrada e saída (desempenho).
3. Decidir se a faixa institucional também vai para o celular (hoje o celular usa barra branca com o menu na gaveta).
4. Rodar o fluxo público real (formulário com anexos no Supabase), que não dá para testar localmente.
5. Passar a nova identidade para o formulário público e para o PDF do comprovante, se fizer parte do escopo.
6. Revisar acessibilidade com leitor de tela (diálogos e tabelas).

## Páginas de acompanhamento

- Antes e depois tela por tela: https://claude.ai/artifact/WG4m9H3e6Ce2ii3nUiJR98
- Logo (símbolo e nome): https://claude.ai/artifact/4v9amXjKMU4fFBg5yqKQ1v
- Login e boas-vindas: https://claude.ai/artifact/Fdur363CwEoCxWhMuVAYX4
- Login dividido (descartado): https://claude.ai/artifact/2MfMSJK5bxMHt8bfLrQs5y
- Entrada no painel: https://claude.ai/artifact/NFSuGZ1PffETXZBdhDoweh
- Menu e barra: https://claude.ai/artifact/TwwqZSPHJFo9JecxnoXnWv
- Saída do painel: https://claude.ai/artifact/3Le9zmm9DmtK83uvP9H6Lj
- Movimento do painel: https://claude.ai/artifact/6ZrAZVvqdV568KMd3TLSm8
- Usuário na faixa: https://claude.ai/artifact/14upX8e9aV4BCo7eUjJpPt
- Listas do Mapa GIS: https://claude.ai/artifact/CTUhBsQkwuwrRq67PqQxoz
- **Resumo de tudo, desde o começo:** https://claude.ai/artifact/9nMo7JFiJEyhfxB3ZM8Hfd
