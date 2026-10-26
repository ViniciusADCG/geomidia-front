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
  official_process_code?: string | null;
  media_type: MediaType;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  area_m2: number | null;
  area_rule_classification?: 'within_limit' | 'above_limit' | null;
  width_m?: number | null;
  bottom_height_m: number | null;
  top_height_m?: number | null;
  expiration_date?: string | null;
  radius_meters: number;
  status: MediaStatus;
  company_responsible?: string | null;
  company_cnpj?: string | null;
  justification?: string | null;
  attachment_links?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RadiusReassessmentPreview {
  asset_id: string;
  registered_radius_meters: number;
  current_radius_meters: number | null;
  condition: string;
  can_reassess: boolean;
  reason_unavailable: string | null;
  rule_id: string | null;
  rule_updated_at: string | null;
  rule_base_radius_meters: number | null;
  rule_area_threshold_m2: number | null;
  rule_radius_above_threshold_meters: number | null;
}

export interface MapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export interface MapFilters {
  mediaType?: MediaType;
  mediaTypes?: MediaType[];
  status?: MediaStatus;
  company?: string;
}

export type MapAssetSummary = Pick<MediaAsset,
  'id' | 'latitude' | 'longitude' | 'radius_meters' | 'media_type' | 'status'
  | 'process_code' | 'official_process_code' | 'company_responsible' | 'contact_name'>;

export interface MapAssetPage {
  items: MapAssetSummary[];
  total: number;
  too_many: boolean;
  max_items: number;
}

export interface MapCluster {
  id: string;
  count: number;
  latitude: number;
  longitude: number;
}

export interface MapClusterPage {
  clusters: MapCluster[];
  total: number;
}

export type MediaAssetInput = Omit<MediaAsset, 'id' | 'process_code' | 'radius_meters' | 'created_at' | 'updated_at'>;
export type MediaAssetUpdateInput = Partial<MediaAssetInput> & {
  confirm_conflict_approval?: boolean;
  confirmed_conflicts?: ConflictItem[];
};

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
  company_cnpj?: string | null;
  municipal_registration: string;
  property_registration: string;
  latitude: number;
  longitude: number;
  street: string;
  number: string;
  district: string;
  postal_code: string;
  media_type: MediaType;
  area_m2: number | null;
  area_rule_classification?: 'within_limit' | 'above_limit' | null;
  bottom_height_m: number | null;
  number_of_faces?: string | null;
  expiration_date?: string | null;
  requester_email: string;
  attachment_links?: string | null;
  attachments: ApplicationFormAttachment[];
  created_at: string;
  updated_at: string;
}

export interface RequirementResponseAttachment {
  index: number;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface RequirementResponse {
  id: string;
  protocol: string;
  process_number: string;
  notice_number: string;
  requester_email: string;
  finalized_at: string;
  receipt_sent: boolean;
  attachments: RequirementResponseAttachment[];
}

export type ApplicationFormInput = Omit<
  ApplicationForm,
  'id' | 'asset_id' | 'process_code' | 'status' | 'attachments' | 'created_at' | 'updated_at'
>;

export interface LinkedApplicationFormUpdate {
  form: Partial<Pick<ApplicationFormInput,
    'company_responsible' | 'company_cnpj' | 'municipal_registration' | 'property_registration'
    | 'street' | 'number' | 'district' | 'postal_code' | 'latitude' | 'longitude'
    | 'media_type' | 'number_of_faces' | 'expiration_date' | 'requester_email'>>;
  asset: Partial<Pick<MediaAssetInput,
    'official_process_code' | 'width_m' | 'top_height_m' | 'status' | 'justification'
    | 'contact_name' | 'attachment_links'>> & {
      confirm_conflict_approval?: boolean;
      confirmed_conflicts?: ConflictItem[];
    };
}

export interface LinkedApplicationFormResult {
  form: ApplicationForm;
  asset: MediaAsset;
}

export interface ProcessTimelineEvent {
  at: string;
  before: MediaStatus | null;
  after: MediaStatus | null;
  analyst_id: string | null;
  analyst_name: string | null;
  analyst_role_inferred: boolean;
  is_entry: boolean;
  is_deletion: boolean;
}

export interface TrackedProcess {
  asset_id: string | null;
  process_code: string;
  official_process_code: string | null;
  current_status: MediaStatus | null;
  created_at: string | null;
  deleted_at: string | null;
  deletion_reason: string | null;
  analysis_started_at: string | null;
  first_approved_at: string | null;
  seconds_to_analysis: number | null;
  seconds_analysis_to_approval: number | null;
  seconds_to_approval: number | null;
  seconds_in_current_status: number | null;
  timeline: ProcessTimelineEvent[];
}

export interface AnalystActivitySummary {
  id: string;
  name: string;
  processes_touched: number;
  actions: number;
  analyses_started: number;
  approvals: number;
}

export interface TrackedAnalyst {
  id: string;
  name: string;
}

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

export interface ApprovalConflictPrompt extends ConflictAnalysis {
  resolve: (confirmed: boolean) => void;
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
