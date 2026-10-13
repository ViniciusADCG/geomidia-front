import { describe, expect, it } from 'vitest';

import { companyFilterOptions, companyKey, companyName } from './company-filter';

describe('filtro de empresas do mapa', () => {
  it('inclui cadastro manual sem formulário ou CNPJ pelo nome de contato', () => {
    const manual = { company_responsible: null, company_cnpj: null, contact_name: '  Empresa Manual  ' };

    expect(companyName(manual)).toBe('Empresa Manual');
    expect(companyFilterOptions([manual])).toEqual([
      { title: 'Todas as empresas', value: 'all' },
      { title: 'Empresa Manual', value: companyKey(manual) },
    ]);
    expect(companyKey(manual)).toBe('empresa manual::');
  });

  it('mantém o nome do formulário e exibe CNPJ quando existe', () => {
    const linked = {
      company_responsible: 'Empresa Formulário',
      company_cnpj: '11222333000144',
      contact_name: 'Pessoa de contato',
    };

    expect(companyName(linked)).toBe('Empresa Formulário');
    expect(companyFilterOptions([linked])[1]).toEqual({
      title: 'Empresa Formulário - CNPJ 11.222.333/0001-44',
      value: companyKey(linked),
    });
  });

  it('usa a mesma chave para nomes manuais equivalentes e ignora cadastros sem nome', () => {
    const first = { company_responsible: null, company_cnpj: null, contact_name: 'Empresa Manual' };
    const second = { company_responsible: '  EMPRESA MANUAL  ', company_cnpj: null, contact_name: null };
    const unnamed = { company_responsible: ' ', company_cnpj: null, contact_name: '  ' };

    expect(companyKey(first)).toBe(companyKey(second));
    expect(companyFilterOptions([first, second, unnamed])).toHaveLength(2);
  });
});
