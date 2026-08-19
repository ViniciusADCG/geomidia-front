<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Usuários e permissões</h2>
        <p>Gerencie quem pode consultar, analisar e administrar o GeoMídia.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus-outline" @click="openCreate">Novo usuário</v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" closable @click:close="error = ''">{{ error }}</v-alert>

    <v-card border>
      <v-table hover>
        <thead>
          <tr><th>Nome</th><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.full_name }}</td>
            <td class="mono">{{ user.username }}</td>
            <td>{{ user.email || '—' }}</td>
            <td><v-chip size="small" variant="tonal">{{ roleLabel(user.role) }}</v-chip></td>
            <td>
              <v-chip :color="user.is_active ? 'success' : 'error'" size="small" variant="tonal">
                {{ user.is_active ? 'Ativo' : 'Inativo' }}
              </v-chip>
            </td>
            <td>
              <div class="row-actions">
                <v-btn icon="mdi-pencil-outline" size="small" variant="tonal" title="Editar usuário" @click="openEdit(user)" />
                <v-btn
                  icon="mdi-trash-can-outline"
                  size="small"
                  color="error"
                  variant="tonal"
                  title="Excluir usuário"
                  :disabled="user.id === auth.userId"
                  @click="deleteTarget = user"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="620">
      <v-card :title="editingId ? 'Editar usuário' : 'Novo usuário'">
        <v-card-text>
          <v-form v-model="valid" class="stack-form" @submit.prevent="save">
            <v-text-field v-model="form.full_name" label="Nome completo" :rules="[required, minLength(3)]" />
            <v-text-field
              v-model="form.username"
              label="Usuário"
              :disabled="Boolean(editingId)"
              :rules="[required, minLength(3)]"
            />
            <v-text-field v-model="form.email" label="E-mail" type="email" />
            <v-select v-model="form.role" label="Perfil" :items="roleOptions" />
            <v-text-field
              v-model="form.password"
              :label="editingId ? 'Nova senha (opcional)' : 'Senha inicial'"
              type="password"
              :rules="editingId && !form.password ? [] : [required, minLength(12)]"
            />
            <v-switch v-if="editingId" v-model="form.is_active" label="Usuário ativo" color="success" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!valid" @click="save">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(deleteTarget)" max-width="460" @update:model-value="!$event && (deleteTarget = null)">
      <v-card title="Excluir usuário">
        <v-card-text>
          Deseja excluir permanentemente o usuário <strong>{{ deleteTarget?.full_name }}</strong>?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteTarget = null">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="confirmDelete">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { User, UserInput, UserRole } from '../types';

const auth = useAuthStore();
const users = ref<User[]>([]);
const dialog = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const valid = ref(false);
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
const required = (value: string) => Boolean(value?.trim()) || 'Campo obrigatório.';
const minLength = (length: number) => (value: string) => value.length >= length || `Mínimo de ${length} caracteres.`;

onMounted(loadUsers);

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
  dialog.value = true;
}

async function save() {
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
