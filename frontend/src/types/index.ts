// ============ 通用 ============
export type ID = number | string;

export type SystemStatus = 'running' | 'maintenance' | 'offline' | 'planning';
export type ProductStatus = 'active' | 'planning' | 'deprecated';
export type Grade = '高价值' | '有价值需改善' | '价值存疑' | '低价值候选';
export type RequirementDecision = '复用' | '扩展' | '跨产品协同' | '新建论证' | '驳回';
export type RequirementStatus = 'pending' | 'approved' | 'rejected' | 'implementing' | 'done';
export type DisposalAction = '整合' | '下线' | '改造' | '保留观察';
export type DisposalStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export interface PageResult<T> {
  items: T[];
  total: number;
}

// ============ 看板 ============
export interface DashboardOverview {
  total_systems: number;
  total_products: number;
  total_domains: number;
  total_requirements: number;
  attributed_rate: number;
  grade_distribution: { grade: string; count: number }[];
  disposal_status_counts: Record<string, number>;
  requirement_decision_counts: Record<string, number>;
  top10_cost_systems: { id: ID; name: string; annual_cost: number }[];
  indicators: { code: string; name: string; target_value: number; current_value: number; unit: string }[];
  domain_coverage: { domain_name: string; product_count: number; system_count: number }[];
}

// ============ 产品 / 产品域 ============
export interface ProductDomain {
  id: ID;
  name: string;
  description?: string;
}

export interface Product {
  id: ID;
  code: string;
  name: string;
  domain_id: ID;
  domain_name?: string;
  owner?: string;
  description?: string;
  status: ProductStatus;
}

// ============ 系统 ============
export interface SystemItem {
  id: ID;
  code: string;
  name: string;
  main_product_id?: ID;
  main_product_name?: string;
  department?: string;
  business_owner?: string;
  tech_owner?: string;
  status: SystemStatus;
  annual_cost?: number;
  user_count?: number;
  go_live_date?: string;
  description?: string;
  latest_score?: number | null;
  latest_grade?: Grade | null;
}

export interface ScoreDimension {
  code: string;
  name: string;
  weight: number;
}

export interface SystemScorePayload {
  scores: Record<string, number>;
}

export interface SystemScoreResult {
  total_score: number;
  grade: Grade;
}

// ============ 需求 ============
export interface RequirementItem {
  id: ID;
  code: string;
  name: string;
  main_product_id?: ID;
  main_product_name?: string;
  weighted_score?: number;
  decision?: RequirementDecision | null;
  status: RequirementStatus;
  description?: string;
  created_at?: string;
}

export interface RequirementScoreInput {
  business_value: number;
  urgency_compliance: number;
  reuse_match: number;
  cost_benefit: number;
  tech_feasibility: number;
  collaboration_impact: number;
}

// ============ 处置 ============
export interface DisposalItem {
  id: ID;
  system_id: ID;
  system_name?: string;
  action: DisposalAction;
  priority: 'high' | 'medium' | 'low';
  reason?: string;
  risk?: string;
  target_date?: string;
  status: DisposalStatus;
}

// ============ 指标 ============
export interface Indicator {
  id: ID;
  code: string;
  name: string;
  target_value: number;
  current_value: number;
  unit: string;
  description?: string;
}

// ============ 方案管理 ============
export type PlanStatus = 'draft' | 'reviewing' | 'approved' | 'archived';
export type PlanVersionSource = 'initial' | 'manual' | 'ai_adopted' | 'rollback';
export type SuggestionTriggerType = 'data_change' | 'leader_feedback' | 'manual';
export type SuggestionStatus = 'pending' | 'adopted' | 'rejected';
export type FeedbackStatus = 'pending' | 'read' | 'handled';

export interface PlanListItem {
  id: ID;
  title: string;
  category: string;
  related_domains?: string;
  status: PlanStatus | string;
  owner?: string;
  owner_email?: string;
  updated_at?: string;
  version_count: number;
  pending_suggestions: number;
}

export interface PlanVersion {
  id: ID;
  version_no: number;
  source: PlanVersionSource | string;
  created_by?: string;
  created_at?: string;
}

export interface PlanFeedback {
  id: ID;
  content: string;
  author?: string;
  status: FeedbackStatus | string;
  created_at?: string;
}

export interface PlanSuggestion {
  id: ID;
  trigger_type: SuggestionTriggerType | string;
  trigger_detail?: string;
  suggestion_md: string;
  base_content_md?: string | null;
  status: SuggestionStatus | string;
  created_at?: string;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
}

export interface PlanDetail extends PlanListItem {
  content_md?: string;
  versions: PlanVersion[];
  feedbacks: PlanFeedback[];
  suggestions: PlanSuggestion[];
}

export interface PlanCreatePayload {
  title: string;
  category: string;
  related_domains: string;
  content_md?: string;
  owner?: string;
  owner_email?: string;
}

export interface PlanUpdatePayload extends Partial<PlanCreatePayload> {
  status?: PlanStatus | string;
}

// ============ 架构图（后端可用时同构） ============
export interface ArchNode {
  title: string;
  children?: ArchNode[];
}

export interface ArchColumn {
  title: string;
  nodes: ArchNode[];
}

export interface ArchitectureData {
  layers: {
    title: string;
    subtitle?: string;
    columns: ArchColumn[];
  }[];
  side?: ArchColumn;
}

// 后端 /architecture 的图结构
export interface ArchitectureNode {
  id: string;
  name: string;
  layer: string;
  pos?: number[];
}
