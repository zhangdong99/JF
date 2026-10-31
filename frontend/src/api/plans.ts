import { http, unwrap } from './http';
import type {
  ID,
  PageResult,
  PlanCreatePayload,
  PlanDetail,
  PlanListItem,
  PlanUpdatePayload,
} from '@/types';

/** 方案分页列表 */
export async function fetchPlans(params: {
  page?: number;
  page_size?: number;
  keyword?: string;
  category?: string;
}): Promise<PageResult<PlanListItem>> {
  const d = unwrap<PageResult<PlanListItem>>(
    await http.get('/plans', { params }),
  );
  if (d && Array.isArray((d as any).items)) return d;
  if (Array.isArray(d)) return { items: d as PlanListItem[], total: d.length };
  return { items: [], total: 0 };
}

export async function fetchPlanDetail(id: ID): Promise<PlanDetail> {
  return unwrap<PlanDetail>(await http.get(`/plans/${id}`));
}

export async function createPlan(payload: PlanCreatePayload): Promise<PlanDetail> {
  return unwrap<PlanDetail>(await http.post('/plans', payload));
}

export async function updatePlan(id: ID, payload: PlanUpdatePayload): Promise<PlanDetail> {
  return unwrap<PlanDetail>(await http.put(`/plans/${id}`, payload));
}

export async function deletePlan(id: ID): Promise<void> {
  await http.delete(`/plans/${id}`);
}

export async function rollbackPlanVersion(id: ID, versionNo: number): Promise<void> {
  await http.post(`/plans/${id}/versions/${versionNo}/rollback`);
}

export async function createPlanFeedback(
  id: ID,
  payload: { content: string; author: string },
): Promise<void> {
  await http.post(`/plans/${id}/feedback`, payload);
}

export async function confirmPlanSuggestion(
  suggestionId: ID,
  payload: { action: 'adopt' | 'reject'; confirmed_by: string },
): Promise<void> {
  await http.post(`/plans/suggestions/${suggestionId}/confirm`, payload);
}

export async function updatePlanSuggestion(
  suggestionId: ID,
  payload: { suggestion_md?: string; trigger_detail?: string },
): Promise<void> {
  await http.patch(`/plans/suggestions/${suggestionId}`, payload);
}
