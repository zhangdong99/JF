import { http, unwrap, unwrapList } from './http';
import type {
  ID,
  DisposalItem,
  Indicator,
  RequirementDecision,
  RequirementItem,
  RequirementScoreInput,
} from '@/types';

// ============ 需求 ============
export async function fetchRequirements() {
  const items = unwrapList<RequirementItem>(await http.get('/requirements'));
  // 后端字段 weighted_total → 前端 weighted_score
  return items.map((it) => ({
    ...it,
    weighted_score: Number(it.weighted_score ?? (it as any).weighted_total ?? 0),
  }));
}

export async function createRequirement(payload: {
  code: string;
  name: string;
  main_product_id?: ID;
  description?: string;
  decision?: RequirementDecision;
  scores: RequirementScoreInput;
}) {
  // 前端六维命名 → 后端 RequirementIn 扁平字段
  const body = {
    code: payload.code,
    name: payload.name,
    main_product_id: payload.main_product_id,
    decision: payload.decision,
    biz_value: payload.scores.business_value,
    urgency: payload.scores.urgency_compliance,
    reuse_match: payload.scores.reuse_match,
    roi: payload.scores.cost_benefit,
    tech_feasible: payload.scores.tech_feasibility,
    synergy: payload.scores.collaboration_impact,
  };
  return unwrap<RequirementItem>(await http.post('/requirements', body));
}

export async function updateRequirement(id: ID, payload: Partial<RequirementItem>) {
  return unwrap<RequirementItem>(await http.put(`/requirements/${id}`, payload));
}

export async function deleteRequirement(id: ID) {
  await http.delete(`/requirements/${id}`);
}

// ============ 处置 ============
export async function fetchDisposals() {
  return unwrapList<DisposalItem>(await http.get('/disposals'));
}

export async function createDisposal(payload: Partial<DisposalItem>) {
  return unwrap<DisposalItem>(await http.post('/disposals', payload));
}

export async function updateDisposal(id: ID, payload: Partial<DisposalItem>) {
  return unwrap<DisposalItem>(await http.put(`/disposals/${id}`, payload));
}

export async function deleteDisposal(id: ID) {
  await http.delete(`/disposals/${id}`);
}

// ============ 指标 ============
export async function fetchIndicators() {
  return unwrapList<Indicator>(await http.get('/indicators'));
}

export async function updateIndicator(id: ID, payload: Partial<Indicator>) {
  return unwrap<Indicator>(await http.put(`/indicators/${id}`, payload));
}
