import { http, unwrap, unwrapList } from './http';
import type {
  ID,
  Product,
  ProductDomain,
  SystemItem,
  SystemScorePayload,
  SystemScoreResult,
  ScoreDimension,
  PageResult,
} from '@/types';

// ============ 产品域 ============
export async function fetchDomains() {
  return unwrapList<ProductDomain>(await http.get('/domains'));
}

// ============ 产品 ============
export async function fetchProducts() {
  return unwrapList<Product>(await http.get('/products'));
}

export async function createProduct(payload: Partial<Product>) {
  return unwrap<Product>(await http.post('/products', payload));
}

export async function updateProduct(id: ID, payload: Partial<Product>) {
  return unwrap<Product>(await http.put(`/products/${id}`, payload));
}

export async function deleteProduct(id: ID) {
  await http.delete(`/products/${id}`);
}

// ============ 系统 ============
export interface SystemQuery {
  keyword?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export async function fetchSystems(params: SystemQuery) {
  return unwrap<PageResult<SystemItem>>(await http.get('/systems', { params }));
}

export async function createSystem(payload: Partial<SystemItem>) {
  return unwrap<SystemItem>(await http.post('/systems', payload));
}

export async function updateSystem(id: ID, payload: Partial<SystemItem>) {
  return unwrap<SystemItem>(await http.put(`/systems/${id}`, payload));
}

export async function deleteSystem(id: ID) {
  await http.delete(`/systems/${id}`);
}

export async function getScoreDimensions() {
  return unwrapList<ScoreDimension>(await http.get('/systems/score-dimensions'));
}

export async function submitSystemScore(id: ID, payload: SystemScorePayload) {
  const res = unwrap<any>(
    await http.post(`/systems/${id}/scores`, {
      scores: Object.entries(payload.scores).map(([dimension_code, score]) => ({
        dimension_code,
        score,
      })),
    }),
  );
  // 后端返回 {system_id,total,grade,detail}
  return { total_score: Number(res?.total ?? 0), grade: res?.grade } as SystemScoreResult;
}
