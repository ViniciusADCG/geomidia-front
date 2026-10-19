<template>
  <section>
    <PageHeader title="Usuários e permissões" description="Quem pode consultar, analisar e administrar o GeoMídia.">
      <template #actions>
        <Button @click="openCreate">
          <UserPlus />
          Novo usuário
        </Button>
      </template>
    </PageHeader>

    <Alert v-if="error && !dialog" variant="destructive" class="mb-4">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div class="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead class="hidden lg:table-cell">E-mail</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead class="w-px"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in users" :key="user.id">
            <TableCell class="min-w-44 font-medium">
              {{ user.full_name }}
              <span v-if="user.id === auth.userId" class="ml-1 text-sm font-normal text-muted-foreground">(você)</span>
            </TableCell>
            <TableCell class="whitespace-nowrap">{{ user.username }}</TableCell>
            <TableCell class="hidden text-muted-foreground lg:table-cell">{{ user.email || '—' }}</TableCell>
            <TableCell class="whitespace-nowrap">{{ roleLabel(user.role) }}</TableCell>
            <TableCell>
              <ToneBadge :tone="user.is_active ? 'success' : 'neutral'">{{ user.is_active ? 'Ativo' : 'Inativo' }}</ToneBadge>
            </TableCell>
            <TableCell>
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" :aria-label="`Editar ${user.full_name}`" title="Editar" @click="openEdit(user)">
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-destructive hover:bg-danger-soft hover:text-destructive"
                  :aria-label="`Excluir ${user.full_name}`"
                  :title="user.id === auth.userId ? 'Você não pode excluir o próprio usuário' : 'Excluir'"
                  :disabled="user.id === auth.userId"
                  @click="deleteTarget = user"
                >
                  <Trash2 />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog :open="dialog" @update:open="dialog = $event">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ editingId ? 'Editar usuário' : 'Novo usuário' }}</DialogTitle>
          <DialogDescription v-if="!editingId">O usuário entra com o nome de usuário e a senha inicial definidos aqui.</DialogDescription>
        </DialogHeader>

        <form id="user-form" class="grid gap-4" novalidate @submit.prevent="save">
          <Alert v-if="error" variant="destructive">
            <CircleAlert />
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <FormField v-slot="{ id, invalid }" label="Nome completo" required :error="show(errors.full_name)">
            <Input :id="id" v-model="form.full_name" autocomplete="off" :aria-invalid="invalid || undefined" />
          </FormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField
              v-slot="{ id, invalid }"
              label="Usuário"
              required
              :hint="editingId ? 'Não pode ser alterado.' : undefined"
              :error="show(errors.username)"
            >
              <Input :id="id" v-model="form.username" autocomplete="off" :disabled="Boolean(editingId)" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id }" label="Perfil">
              <Select v-model="form.role">
                <SelectTrigger :id="id" class="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField v-slot="{ id }" label="E-mail">
            <Input :id="id" :model-value="form.email ?? ''" type="email" autocomplete="off" @update:model-value="form.email = String($event)" />
          </FormField>
          <FormField
            v-slot="{ id, invalid, describedBy }"
            :label="editingId ? 'Nova senha' : 'Senha inicial'"
            :required="!editingId"
            :hint="editingId ? 'Deixe em branco para manter a senha atual. Mínimo de 12 caracteres.' : 'Mínimo de 12 caracteres.'"
            :error="show(errors.password)"
          >
            <Input
              :id="id"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
          <label v-if="editingId" class="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
            <span>
              <span class="block font-medium">Usuário ativo</span>
              <span class="block text-sm text-muted-foreground">Usuários inativos não conseguem entrar.</span>
            </span>
            <Switch v-model="form.is_active" />
          </label>
        </form>

        <DialogFooter>
          <Button variant="outline" @click="dialog = false">Cancelar</Button>
          <Button type="submit" form="user-form" :disabled="saving">
            <LoaderCircle v-if="saving" class="animate-spin" />
            {{ editingId ? 'Salvar alterações' : 'Criar usuário' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="Boolean(deleteTarget)" @update:open="!$event && (deleteTarget = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {{ deleteTarget?.full_name }}?</AlertDialogTitle>
          <AlertDialogDescription>O usuário perde o acesso ao GeoMídia. Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" @click="deleteTarget = null">Cancelar</Button>
          <Button variant="destructive" :disabled="saving" @click="confirmDelete">
            <LoaderCircle v-if="saving" class="animate-spin" />
            Excluir usuário
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, LoaderCircle, Pencil, Trash2, UserPlus } from '@lucide/vue';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

import ToneBadge from '@/components/common/ToneBadge.vue';
import FormField from '@/components/form/FormField.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { User, UserInput, UserRole } from '../types';

const auth = useAuthStore();
const users = ref<User[]>([]);
const dialog = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const attempted = ref(false);
const error = ref('');
const deleteTarget = ref<User | null>(null);
const roleOptions = [
  { title: 'Consulta', value: 'viewer' },
  { title: 'Analista', value: 'analyst' },
  { title: 'Administrador', value: 'admin' },
];
const form = reactive<UserInput & { is_active: boolean }>({
  username: '', full_name: '', email: '', password: '', role: 'viewer', is_active: true,
});
const errors = computed(() => ({
  full_name: !form.full_name.trim() ? 'Informe o nome completo.' : form.full_name.length < 3 ? 'Mínimo de 3 caracteres.' : null,
  username: !form.username.trim() ? 'Informe o usuário.' : form.username.length < 3 ? 'Mínimo de 3 caracteres.' : null,
  password: editingId.value && !form.password
    ? null
    : !form.password.trim() ? 'Informe a senha inicial.' : form.password.length < 12 ? 'Mínimo de 12 caracteres.' : null,
}));
const valid = computed(() => Object.values(errors.value).every((message) => !message));

function show(message: string | null) {
  return attempted.value ? message : null;
}

onMounted(() => {
  window.addEventListener('geomidia:users-refresh', loadUsers);
  void loadUsers();
});
onUnmounted(() => window.removeEventListener('geomidia:users-refresh', loadUsers));

async function loadUsers() {
  try {
    users.value = await api.listUsers();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao carregar usuários.';
  }
}

function roleLabel(role: UserRole) {
  return { admin: 'Administrador', analyst: 'Analista', viewer: 'Consulta' }[role];
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { username: '', full_name: '', email: '', password: '', role: 'viewer', is_active: true });
  attempted.value = false;
  error.value = '';
  dialog.value = true;
}

function openEdit(user: User) {
  editingId.value = user.id;
  Object.assign(form, {
    username: user.username,
    full_name: user.full_name,
    email: user.email ?? '',
    password: '',
    role: user.role,
    is_active: user.is_active,
  });
  attempted.value = false;
  error.value = '';
  dialog.value = true;
}

async function save() {
  attempted.value = true;
  if (!valid.value) return;
  saving.value = true;
  error.value = '';
  try {
    if (editingId.value) {
      await api.updateUser(editingId.value, {
        full_name: form.full_name,
        email: form.email || null,
        role: form.role,
        is_active: form.is_active,
        ...(form.password ? { password: form.password } : {}),
      } as Partial<Omit<UserInput, 'username'>> & { is_active: boolean });
    } else {
      await api.createUser({ ...form, email: form.email || null });
    }
    await loadUsers();
    dialog.value = false;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao salvar usuário.';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  saving.value = true;
  error.value = '';
  try {
    await api.deleteUser(deleteTarget.value.id);
    deleteTarget.value = null;
    await loadUsers();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao excluir usuário.';
  } finally {
    saving.value = false;
  }
}
</script>
