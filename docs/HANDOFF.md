# Handoff: refatoração visual do GeoMídia

Branch: `feat/refatoracao-visual`, a partir da `main` (`5d13136`). Atualizado em 19/10/2026.
Status: **pausada, tudo commitado, ainda não enviada ao GitHub** (sem push e sem PR).

Este arquivo é o ponto de retomada. O plano original está em [`specs/2026-10-19-refatoracao-visual.md`](specs/2026-10-19-refatoracao-visual.md).

## Regra que guiou tudo

Só o frontend mudou. O backend, o contrato da API e a lógica do front ficaram como estavam: `stores/`, `services/api.ts`, `types.ts`, `domain/`, `utils/`, rotas e permissões. Os testes antigos (101) passam em todas as etapas, e entraram 4 testes novos da saudação: **105 passando**.

## O que foi feito

1. **Saída do Vuetify.** Agora o front usa Tailwind v4 + shadcn-vue (componentes copiados em `src/components/ui`, editáveis) com ícones `@lucide/vue`. Saíram o Vuetify, o `@mdi/font` e o `src/styles/main.css` (1.459 linhas, 53 `!important`). O JS principal caiu de 121 KB para 85 KB (gzip).
2. **Identidade PREFCG/SEMADES**, conforme o manual da marca:
   - azul `#283587` e amarelo `#FFCC00`;
   - fonte Onest (substituta aberta da Qanelas);
   - marcas oficiais geradas dos PDFs em `public/brand/`;
   - assinatura visual: traço amarelo inclinado a -12° (`brand-slant`).
3. **As 9 telas refeitas**, com listas empilhadas no celular e erros do servidor exibidos dentro dos diálogos.
4. **Telas grandes divididas em componentes.** O Inventário virou lista + `AssetFormDialog` + `RadiusReassessmentDialog`, e o Mapa ganhou `AssetDetails`.
5. **Logo do GeoMídia**: a logo antiga em PNG foi redesenhada em vetor e virou também o `public/favicon.svg`.
6. **Login novo**: cartão central sobre um fundo animado em canvas.
7. **Entrada no painel ("Pino pousa")**: depois do login o fundo animado continua, o cartão se achata numa linha amarela, o símbolo se monta com a saudação do horário e voa até o logo da faixa.
8. **Faixa institucional com abas**: no computador, faixa azul de ponta a ponta (logo, marcas oficiais, usuário) e abas logo abaixo; Processos e Administração em menus suspensos. O Sair fica no menu do usuário. No celular continua o menu na gaveta lateral.

## Decisões fechadas com o usuário

| Item | Escolha | Onde está |
| --- | --- | --- |
| Base de componentes | Tailwind + shadcn-vue | `src/components/ui`, `src/styles/tailwind.css` |
| Direção visual | Institucional moderno | tokens em `src/styles/tailwind.css` |
| Fonte | Onest | `@fontsource-variable/onest` |
| Símbolo | "Lote marcado": pino sobre 3 camadas, a de cima com quadras e o quarteirão sob o pino em destaque | `src/components/brand/geomidia-marks.ts` |
| Nome | "Geo" azul-escuro + "Mídia" azul-claro, formatação "Hierarquia" (nome maior, legenda menor com traço amarelo) | `src/components/brand/GeoMidiaLockup.vue` |
| Layout do login | Cartão sobre fundo animado | `src/views/LoginView.vue` |
| Fundo do login | Avenidas e quadras; cada carro que passa faz surgir uma placa com o raio mínimo e um anel ("Destaque na passagem") | `src/components/login/login-background-scenes.ts` |
| Boas-vindas | "Pino pousa": cartão vira linha amarela, símbolo se monta com Bom dia (5h–12h) / Boa tarde (12h–18h) / Boa noite e voa ao logo da faixa | `src/components/welcome/WelcomeOverlay.vue`, `src/composables/useWelcome.ts`, `src/lib/greeting.ts` |
| Saída | "Cidade sai do logo": a cidade do login se abre em círculo a partir do logo da faixa, "Até logo, Nome", e o cartão do login volta saindo do desfoque | `src/components/welcome/FarewellOverlay.vue`, `src/composables/useFarewell.ts` |
| Casca do painel | "Faixa institucional" + "Abas com menus" no computador; gaveta lateral no celular | `src/App.vue`, `src/components/layout/AppTopNav.vue`, `nav-items.ts` |

Todas as animações respeitam `prefers-reduced-motion`. A de boas-vindas pode ser pulada com clique ou Esc.

## Mapa do código novo

```
src/components/
  ui/            shadcn-vue (button, input, select, dialog, alert-dialog, table, sheet...)
  brand/         BrandLockup (SEMADES + PREFCG), GeoMidiaMark/Lockup, geomidia-marks.ts (SVG do símbolo)
  layout/        AppTopbar (faixa), AppTopNav (abas), AppSidebar (gaveta do celular), nav-items, PageHeader
  common/        StatusBadge, ToneBadge, EmptyState, SearchInput, TablePager
  form/          FormField, FormSection, AttachmentLinksEditor
  inventory/     AssetFormDialog, RadiusReassessmentDialog
  map/           AssetDetails, DetailSection, DetailItem
  expirations/   ExpirationListCard
  login/         LoginForm, LoginBackground, login-background-scenes.ts
  welcome/       WelcomeOverlay
src/composables/useWelcome.ts   liga a animação de boas-vindas
src/lib/greeting.ts             saudação por horário (com testes)
src/lib/tones.ts                cores semânticas dos selos
src/styles/tailwind.css         tokens da marca e base
src/styles/map.css              estilos dos elementos criados pelo Leaflet
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

1. Revisar com o Vinicius e decidir o destino do PR (`dev` ou `main`).
2. Testar em celular de verdade, em especial o mapa e o fundo animado do login (desempenho).
3. Rodar o fluxo público real (formulário com anexos no Supabase), que não dá para testar localmente.
4. Passar a nova identidade para o formulário público e para o PDF do comprovante, se fizer parte do escopo.
5. Revisar acessibilidade com leitor de tela (diálogos e tabelas).

## Páginas de acompanhamento

- Antes e depois tela por tela: https://claude.ai/artifact/WG4m9H3e6Ce2ii3nUiJR98
- Logo (símbolo e nome): https://claude.ai/artifact/4v9amXjKMU4fFBg5yqKQ1v
- Login e boas-vindas: https://claude.ai/artifact/Fdur363CwEoCxWhMuVAYX4
