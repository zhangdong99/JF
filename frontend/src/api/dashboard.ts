import { http, unwrap } from './http';
import type { ArchColumn, ArchitectureData, ArchitectureNode, DashboardOverview } from '@/types';

/** 后端 nodes/edges 图结构 → 页面所需的 layers/side 层级结构 */
function buildArchitecture(d: any): ArchitectureData {
  const nodes: ArchitectureNode[] = d?.nodes ?? [];
  if (!nodes.length) return d;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  // 子节点：id 形如 "<父id>-<序号>"
  const childrenOf = new Map<string, ArchitectureNode[]>();
  const mainNodes: ArchitectureNode[] = [];
  for (const n of nodes) {
    const m = n.id.match(/^(.+)-\d+$/);
    if (m && byId.has(m[1])) {
      const list = childrenOf.get(m[1]) ?? [];
      list.push(n);
      childrenOf.set(m[1], list);
    } else {
      mainNodes.push(n);
    }
  }
  const layerNames: string[] = Array.isArray(d.layers) && typeof d.layers[0] === 'string'
    ? d.layers
    : ['决策层', '执行层', '支撑层'];
  const sortedChildren = (id: string) =>
    (childrenOf.get(id) ?? []).sort((a, b) => (a.pos?.[0] ?? 0) - (b.pos?.[0] ?? 0));

  const toColumn = (n: ArchitectureNode): ArchColumn => ({
    title: n.name,
    nodes: [
      {
        title: n.name,
        children: sortedChildren(n.id).map((c) => ({ title: c.name })),
      },
    ],
  });

  const layers = layerNames
    .filter((name) => name !== '预算管控')
    .map((name) => {
      const cols = mainNodes
        .filter((n) => n.layer === name)
        .sort((a, b) => (a.pos?.[0] ?? 0) - (b.pos?.[0] ?? 0) || (a.pos?.[1] ?? 0) - (b.pos?.[1] ?? 0))
        .map(toColumn);
      return { title: name, columns: cols };
    })
    .filter((l) => l.columns.length > 0);

  const sideNodes = nodes
    .filter((n) => n.layer === '预算管控')
    .sort((a, b) => (a.pos?.[1] ?? 0) - (b.pos?.[1] ?? 0));

  return {
    layers,
    side: sideNodes.length ? { title: '预算管控', nodes: sideNodes.map((n) => ({ title: n.name })) } : undefined,
  };
}

export async function fetchDashboardOverview() {
  return unwrap<DashboardOverview>(await http.get('/dashboard/overview'));
}

export async function fetchArchitecture() {
  const d = unwrap<any>(await http.get('/architecture'));
  if (d && Array.isArray(d.layers) && typeof d.layers[0] === 'object' && d.layers[0]?.columns) {
    return d as ArchitectureData;
  }
  return buildArchitecture(d);
}
