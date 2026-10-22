import {
  CalendarClock,
  FileWarning,
  Inbox,
  LayoutDashboard,
  Map,
  SlidersHorizontal,
  TableProperties,
  UsersRound,
} from '@lucide/vue';
import type { Component } from 'vue';

// Itens de navegação do painel, usados pelo menu lateral e pelas abas.
export interface NavItem { title: string; name: string; to: string; icon: Component }
export interface NavGroup { label?: string; items: NavItem[] }

export function navGroups(canWrite: boolean, isAdmin: boolean): NavGroup[] {
  return [
    {
      items: [
        { title: 'Dashboard', name: 'dashboard', to: '/', icon: LayoutDashboard },
        { title: 'Mapa GIS', name: 'map', to: '/mapa', icon: Map },
        { title: 'Inventário', name: 'inventory', to: '/inventario', icon: TableProperties },
        { title: 'Vencimentos', name: 'expirations', to: '/vencimentos', icon: CalendarClock },
      ],
    },
    ...(canWrite
      ? [{
        label: 'Processos',
        items: [
          { title: 'Solicitações recebidas', name: 'forms', to: '/formularios', icon: Inbox },
          { title: 'Comunicados de exigência', name: 'requirements', to: '/comunicados-de-exigencia', icon: FileWarning },
        ],
      }]
      : []),
    ...(isAdmin
      ? [{
        label: 'Administração',
        items: [
          { title: 'Usuários', name: 'users', to: '/usuarios', icon: UsersRound },
          { title: 'Regras de negócio', name: 'rules', to: '/regras', icon: SlidersHorizontal },
        ],
      }]
      : []),
  ];
}
