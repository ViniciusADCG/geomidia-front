export type MediaType =
  | 'outdoor'
  | 'front light'
  | 'triface'
  | 'painel de led'
  | 'painel eletronico modular'
  | 'empena'
  | 'empena de led';

export type MediaStatus =
  | 'novos processos'
  | 'aprovado'
  | 'irregular'
  | 'análise'
  | 'exigência'
  | 'vencido'
  | 'cartografia'
  | 'jurídico'
  | 'vistoria';

export type ActivityType = 'cadastro' | 'aprovacao' | 'reprovacao' | 'edicao' | 'remocao';
export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserInput {
  username: string;
  full_name: string;
  email?: string | null;
  password: string;
  role: UserRole;
}

export interface MediaRule {
  id: string;
  media_type: MediaType;
  name: string;
  base_radius_meters: number;
  area_threshold_m2?: number | null;
  radius_above_threshold_meters?: number | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MediaRuleInput = Omit<MediaRule, 'id' | 'created_at' | 'updated_at'>;

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user_name: string;
  user_id: string;
  role: UserRole;
  expires_at: string;
}

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
  expiration_date?: string | null;
  radius_meters: number;
  status: MediaStatus;
  justification?: string | null;
  attachment_links?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  created_at: string;
  updated_at: string;
}

export type MediaAssetInput = Omit<MediaAsset, 'id' | 'process_code' | 'radius_meters' | 'created_at' | 'updated_at'>;

export interface ApplicationFormAttachment {
  id: string;
  category: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ApplicationForm {
  id: string;
  asset_id: string;
  process_code: string;
  status: MediaStatus;
  company_responsible: string;
  municipal_registration: string;
  property_registration: string;
  latitude: number;
  longitude: number;
  street: string;
  number: string;
  district: string;
  postal_code: string;
  media_type: MediaType;
  area_m2: number;
  bottom_height_m: number;
  number_of_faces?: string | null;
  expiration_date?: string | null;
  requester_email: string;
  attachment_links?: string | null;
  attachments: ApplicationFormAttachment[];
  created_at: string;
  updated_at: string;
}

export type ApplicationFormInput = Omit<
  ApplicationForm,
  'id' | 'asset_id' | 'process_code' | 'status' | 'attachments' | 'created_at' | 'updated_at'
>;

export interface ActivityLog {
  id: string;
  asset_id?: string | null;
  actor_user_id?: string | null;
  process_code: string;
  activity_type: ActivityType;
  message: string;
  changes?: Record<string, unknown> | null;
  request_id?: string | null;
  created_at: string;
}

export interface ConflictAnalysis {
  has_conflict: boolean;
  message: string;
  conflicting_asset_id?: string | null;
  distance_meters?: number | null;
  minimum_distance_meters?: number | null;
  conflicts: ConflictItem[];
}

export interface ConflictItem {
  conflicting_asset_id: string;
  process_code: string;
  media_type: string;
  distance_meters: number;
  minimum_distance_meters: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface MediaStats {
  total: number;
  new_processes: number;
  pending: number;
  approved: number;
  rejected: number;
  expiring_soon: number;
  expired: number;
  by_type: Record<string, number>;
}

export interface ExpirationOverview {
  reference_date: string;
  window_end_date: string;
  expiring_soon: MediaAsset[];
  expired: MediaAsset[];
}
