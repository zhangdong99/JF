import axios from 'axios';
import { message } from 'antd';

/** axios 实例：统一前缀与错误提示 */
export const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message || '网络请求失败';
    message.error(`请求失败：${detail}`);
    return Promise.reject(error);
  },
);

/** 剥掉后端统一包装 {code,message,data}，返回业务数据 */
export function unwrap<T = any>(resp: any): T {
  const body = resp?.data;
  if (body && typeof body === 'object' && 'code' in body && 'data' in body) return body.data as T;
  return body as T;
}

/** 列表接口：兼容裸数组与 {total,items,...} 分页两种返回 */
export function unwrapList<T = any>(resp: any): T[] {
  const d = unwrap<any>(resp);
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.items)) return d.items;
  return [];
}
