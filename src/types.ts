export type MediaType =
  | 'outdoor'
  | 'front light'
  | 'triface'
  | 'painel de led'
  | 'empena'
  | 'empena de led';

export type MediaStatus = 'Aprovado' | 'Reprovado' | 'Pendente';

export type ActivityType = 'cadastro' | 'aprovacao' | 'reprovacao' | 'edicao' | 'remocao';

export interface MediaAsset {
  id: string;
  process_code: string;
  media_type: MediaType;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  area_m2: number;
  width_m?: number | null;
  bottom_height_m: number;
  top_height_m?: number | null;
  radius_meters: number;
  status: MediaStatus;
  justification?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  created_at: string;
  updated_at: string;
}

export type MediaAssetInput = Omit<MediaAsset, 'id' | 'process_code' | 'radius_meters' | 'created_at' | 'updated_at'>;

export interface ActivityLog {
  id: string;
  asset_id?: string | null;
  process_code: string;
  activity_type: ActivityType;
  message: string;
  created_at: string;
}

export interface ConflictAnalysis {
  has_conflict: boolean;
  message: string;
  conflicting_asset_id?: string | null;
  distance_meters?: number | null;
  minimum_distance_meters?: number | null;
}

export interface MediaStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  by_type: Record<string, number>;
}
