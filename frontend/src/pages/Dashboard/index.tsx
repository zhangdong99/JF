import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Progress, Row, Spin, Statistic, Typography } from 'antd';
import type { EChartsOption } from 'echarts';
import EChart from '@/components/EChart';
import { fetchDashboardOverview } from '@/api/dashboard';
import type { DashboardOverview } from '@/types';

const PIE_COLORS = ['#2f6bff', '#13c2c2', '#722ed1', '#fa8c16', '#52c41a', '#eb2f96'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDashboardOverview()
      .then(setData)
      .catch(() => setError('无法连接后端服务（/api/v1/dashboard/overview），请确认后端已启动。'))
      .finally(() => setLoading(false));
  }, []);

  const gradePie = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      color: PIE_COLORS,
      series: [
        {
          name: '评分等级分布',
          type: 'pie',
          radius: ['40%', '65%'],
          itemStyle: { borderRadius: 6 },
          label: { formatter: '{b}: {c}' },
          data: (data?.grade_distribution ?? []).map((g) => ({ name: g.grade, value: g.count })),
        },
      ],
    }),
    [data],
  );

  const decisionPie = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      color: PIE_COLORS,
      series: [
        {
          name: '需求决策分布',
          type: 'pie',
          radius: '60%',
          itemStyle: { borderRadius: 6 },
          label: { formatter: '{b}: {c}' },
          data: Object.entries(data?.requirement_decision_counts ?? {}).map(([name, value]) => ({
            name,
            value,
          })),
        },
      ],
    }),
    [data],
  );

  const domainBar = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      grid: { left: 40, right: 16, top: 30, bottom: 50 },
      xAxis: { type: 'category', data: (data?.domain_coverage ?? []).map((d) => d.domain_name) },
      yAxis: { type: 'value' },
      series: [
        { name: '产品数', type: 'bar', data: (data?.domain_coverage ?? []).map((d) => d.product_count) },
        { name: '系统数', type: 'bar', data: (data?.domain_coverage ?? []).map((d) => d.system_count) },
      ],
    }),
    [data],
  );

  const costBar = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} 万元` },
      grid: { left: 130, right: 30, top: 10, bottom: 30 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: (data?.top10_cost_systems ?? [])
          .slice()
          .reverse()
          .map((s) => s.name),
      },
      series: [
        {
          name: '年度成本',
          type: 'bar',
          barMaxWidth: 18,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          data: (data?.top10_cost_systems ?? [])
            .slice()
            .reverse()
            .map((s) => s.annual_cost),
        },
      ],
    }),
    [data],
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card><Statistic title="系统总数" value={data?.total_systems ?? 0} /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card><Statistic title="产品总数" value={data?.total_products ?? 0} /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card><Statistic title="产品域数" value={data?.total_domains ?? 0} /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title="需求总数" value={data?.total_requirements ?? 0} suffix="｜" />
            <Statistic title="归属率" value={data?.attributed_rate ?? 0} precision={1} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="评分等级分布">
            <EChart option={gradePie} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="需求决策分布">
            <EChart option={decisionPie} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="各产品域系统覆盖">
            <EChart option={domainBar} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="成本 Top10 系统">
            <EChart option={costBar} height={300} />
          </Card>
        </Col>
        <Col span={24}>
          <Card title="治理指标进度">
            {(data?.indicators ?? []).length === 0 && (
              <Typography.Text type="secondary">暂无指标数据</Typography.Text>
            )}
            <Row gutter={[24, 16]}>
              {(data?.indicators ?? []).map((ind) => {
                const pct = ind.target_value ? (ind.current_value / ind.target_value) * 100 : 0;
                return (
                  <Col key={ind.code} xs={24} md={12} xl={8}>
                    <div style={{ marginBottom: 4 }}>
                      <Typography.Text strong>{ind.name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                        {ind.current_value} / {ind.target_value} {ind.unit}
                      </Typography.Text>
                    </div>
                    <Progress
                      percent={Math.round(pct * 10) / 10}
                      status={pct >= 100 ? 'success' : 'active'}
                    />
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
