import type { ArchitectureData } from '@/types';

/** /api/v1/architecture 不可用时的兜底数据（与后端同构） */
export const architectureFallback: ArchitectureData = {
  layers: [
    {
      title: '决策层',
      subtitle: '战略解码与目标管控',
      columns: [
        {
          title: '战略与规划',
          nodes: [
            { title: '战略解码', children: [] },
            { title: '产品规划 / 支撑规划', children: [] },
            { title: '年度重点工作', children: [] },
          ],
        },
        {
          title: '过程管控',
          nodes: [
            { title: '进度管控', children: [] },
            { title: '目标变更', children: [] },
            { title: '战略复盘', children: [] },
          ],
        },
      ],
    },
    {
      title: '执行层',
      subtitle: '四大运营主线',
      columns: [
        {
          title: '项目运营',
          nodes: [
            {
              title: '项目全生命周期',
              children: [
                { title: '立项', children: [] },
                { title: '进度管控', children: [] },
                { title: '质量/风险/资源/成本', children: [] },
                { title: '项目变更', children: [] },
                { title: '结项复盘', children: [] },
              ],
            },
          ],
        },
        {
          title: '架构运营',
          nodes: [
            {
              title: '四大架构领域',
              children: [
                { title: '信息架构', children: [] },
                { title: '应用架构', children: [] },
                { title: '技术架构', children: [] },
                { title: '安全架构', children: [] },
              ],
            },
          ],
        },
        {
          title: '产品运营',
          nodes: [
            {
              title: '指标评价与迭代',
              children: [
                { title: '制定评价指标', children: [] },
                { title: '通用/灯塔指标', children: [] },
                { title: '指标评价', children: [] },
                { title: '产品迭代', children: [] },
              ],
            },
          ],
        },
        {
          title: '需求运营',
          nodes: [
            {
              title: '需求准入闭环',
              children: [
                { title: '收集', children: [] },
                { title: '分级', children: [] },
                { title: '评审', children: [] },
                { title: '排期', children: [] },
                { title: '跟踪', children: [] },
                { title: '评价', children: [] },
                { title: '沉淀', children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      title: '支撑层',
      subtitle: '流程与规范',
      columns: [
        {
          title: '流程运营',
          nodes: [
            { title: '流程审视', children: [] },
            { title: '流程监控', children: [] },
            { title: '流程优化', children: [] },
          ],
        },
      ],
    },
  ],
  side: {
    title: '预算管控',
    nodes: [
      { title: '预算编制', children: [] },
      { title: '分级审核', children: [] },
      { title: '预算批复', children: [] },
      { title: '执行管控', children: [] },
      { title: '变更管理', children: [] },
      { title: '精益复盘', children: [] },
    ],
  },
};
