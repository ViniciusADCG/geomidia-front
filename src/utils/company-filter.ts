import type { MediaAsset } from '../types';

type CompanyAsset = Pick<MediaAsset, 'company_responsible' | 'company_cnpj' | 'contact_name'>;

export function companyName(asset: CompanyAsset): string {
  return asset.company_responsible?.trim() || asset.contact_name?.trim() || '';
}

export function companyKey(asset: CompanyAsset): string {
  return `${normalize(companyName(asset))}::${normalize(asset.company_cnpj)}`;
}

export function companyFilterOptions(assets: CompanyAsset[]): { title: string; value: string }[] {
  const companies = new Map<string, { title: string; value: string }>();

  assets.forEach((asset) => {
    const name = companyName(asset);
    if (!name) return;

    const value = companyKey(asset);
    const cnpj = asset.company_cnpj?.trim();
    companies.set(value, {
      title: cnpj ? `${name} - CNPJ ${formatCompanyCnpj(cnpj)}` : name,
      value,
    });
  });

  return [
    { title: 'Todas as empresas', value: 'all' },
    ...Array.from(companies.values()).sort((first, second) => first.title.localeCompare(second.title, 'pt-BR')),
  ];
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '').trim().toLocaleLowerCase('pt-BR');
}

function formatCompanyCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
