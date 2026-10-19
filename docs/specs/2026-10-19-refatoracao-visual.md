# Refatoração visual do GeoMídia

Branch: `feat/refatoracao-visual`. Escopo: apenas o frontend. O backend e o contrato da API não mudam.

## Objetivo

Trocar o Vuetify por Tailwind CSS + shadcn-vue e aplicar a identidade oficial da Prefeitura de Campo Grande (PREFCG) e da SEMADES, num visual "institucional moderno". Ao final, o Vuetify, o `@mdi/font` e o CSS global legado (`src/styles/main.css`) saem do projeto.

## Identidade

Fonte: manual da marca PREFCG e arquivos de marca SEMADES 2025/2026.

| Token | Valor | Uso |
| --- | --- | --- |
| `brand-navy` / `primary` | `#283587` | Ações principais, links, item ativo |
| `brand-night` / `sidebar` | `#1B2463` | Menu lateral |
| `brand-yellow` | `#FFCC00` | Só destaque (marcadores, foco sobre fundo escuro). Nunca texto sobre branco |
| `background` | `#F4F6FB` | Fundo das telas |
| `foreground` | `#1F2650` | Texto |

- Fonte: Onest (`@fontsource-variable/onest`), substituta aberta da Qanelas. Números tabulares em códigos e tabelas.
- Marcas: em meio digital, só a sigla SEMADES à esquerda da placa PREFCG, centralizadas na vertical, com margem mínima de metade da altura do "P". Em fundo azul, as duas na versão branca. Os arquivos ficam em `public/brand/` e foram gerados a partir dos PDFs oficiais.
- Assinatura visual: a inclinação da placa PREFCG (`brand-slant`, -12°) no marcador do item ativo do menu e no sublinhado do título da página. Nenhum outro ornamento.

## Organização do código

```
src/
  components/
    ui/          componentes shadcn-vue (código nosso, editável)
    brand/       BrandLockup (SEMADES + PREFCG)
    layout/      AppSidebar, AppTopbar, PageHeader
    <feature>/   subcomponentes extraídos das telas grandes
  views/         uma tela por rota (o router não muda)
  stores/ services/ domain/ utils/ types.ts   lógica: não muda nesta refatoração
  styles/tailwind.css   tokens e base
  lib/utils.ts          cn()
```

Regra: a refatoração mexe em template, estilo e componentes de apresentação. Stores, `services/api.ts`, `types.ts`, `domain/` e `utils/` ficam como estão, assim como os eventos entre telas e o `App.vue` (`navigate`, `view-map`, `geomidia:*`).

## Migração

Incremental, com o Vuetify convivendo até a última etapa:

1. Base: Tailwind v4, shadcn-vue, Onest, tokens e logos
2. Casca: menu lateral, barra superior e diálogos globais do `App.vue`
3. Login
4. Dashboard, Vencimentos, Usuários, Regras, Comunicados, Solicitações, Inventário, Mapa
5. Remoção do Vuetify, do `@mdi/font` e do `main.css`, e otimização das imagens

Critério de cada etapa: `npm test` (101 testes), `vue-tsc` e `npm run build` passando, e a tela conferida por screenshot em 1440px e 390px.
