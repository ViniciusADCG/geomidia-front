import { computed, ref } from 'vue';

import { api } from '../services/api';
import type { ApplicationForm } from '../types';

export function useApplicationFormList() {
  const items = ref<ApplicationForm[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
  const searchDraft = ref('');
  const search = ref('');
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref('');
  let requestVersion = 0;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  async function load(): Promise<void> {
    const version = ++requestVersion;
    loading.value = true;
    error.value = '';
    try {
      const result = await api.listApplicationForms({
        search: search.value,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
      });
      if (version !== requestVersion) return;
      total.value = result.total;
      const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value));
      if (page.value > lastPage) {
        page.value = lastPage;
        await load();
        return;
      }
      items.value = result.items;
      loaded.value = true;
    } catch (caught) {
      if (version === requestVersion) {
        error.value = caught instanceof Error ? caught.message : 'Falha ao carregar as solicitações recebidas.';
      }
    } finally {
      if (version === requestVersion) loading.value = false;
    }
  }

  function changePage(value: number): void {
    if (value < 1 || value > pageCount.value || value === page.value) return;
    page.value = value;
    void load();
  }

  function changePageSize(value: number): void {
    if (![25, 50, 100].includes(value) || value === pageSize.value) return;
    pageSize.value = value;
    page.value = 1;
    void load();
  }

  function scheduleSearch(value: string): void {
    searchDraft.value = value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      search.value = searchDraft.value.trim();
      page.value = 1;
      void load();
    }, 350);
  }

  function dispose(): void {
    clearTimeout(searchTimer);
    requestVersion++;
  }

  return {
    items, total, page, pageSize, pageCount, searchDraft, search, loading, loaded, error,
    load, changePage, changePageSize, scheduleSearch, dispose,
  };
}
