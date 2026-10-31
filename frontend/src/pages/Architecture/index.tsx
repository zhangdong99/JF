import { useEffect, useState } from 'react';
import { Alert, Card, Spin, Tag } from 'antd';
import { ArrowDownOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { fetchArchitecture } from '@/api/dashboard';
import { architectureFallback } from '@/mock/architecture';
import type { ArchColumn, ArchitectureData } from '@/types';
import './index.css';

const LAYER_COLORS = ['#2f6bff', '#13c2c2', '#52c41a'];
const SIDE_COLOR = '#fa8c16';

function ColumnBlock({ column }: { column: ArchColumn }) {
  const nodes = column?.nodes ?? [];
  return (
    <div className="arch-column">
      <div className="arch-column-title">{column?.title}</div>
      <div className="arch-nodes">
        {nodes.map((node) => {
          const children = node?.children ?? [];
          return (
            <div key={node?.title} className="arch-node-group">
              <div className="arch-node main-node">{node?.title}</div>
              {children.length > 0 && (
                <>
                  <div className="arch-flow-v"><ArrowDownOutlined /></div>
                  <div className="arch-node-children">
                    {children.map((child, i) => (
                      <div key={child?.title} className="arch-child-item">
                        {i > 0 && <div className="arch-arrow"><ArrowRightOutlined /></div>}
                        <div className="arch-node child-node">{child?.title}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SideColumn({ column }: { column: ArchColumn }) {
  return (
    <Card size="small" className="arch-side-card" title={column.title}>
      <div className="arch-side-flow">
        {column.nodes.map((node) => (
          <div key={node.title}>
            <div className="arch-node side-node">{node.title}</div>
            <div className="arch-flow-v"><ArrowDownOutlined /></div>
          </div>
        ))}
        <Tag color="orange">贯穿各层</Tag>
      </div>
    </Card>
  );
}

export default function Architecture() {
  const [data, setData] = useState<ArchitectureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchArchitecture()
      .then((d) => setData(d))
      .catch(() => {
        setData(architectureFallback);
        setUsedFallback(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div>
      {usedFallback && (
        <Alert
          type="warning"
          showIcon
          message="后端 /api/v1/architecture 不可用，当前展示内置治理架构数据。"
          style={{ marginBottom: 16 }}
        />
      )}
      <div className="arch-wrap">
        <div className="arch-layers">
          {(data?.layers ?? []).map((layer, i) => {
            const columns = layer?.columns ?? [];
            return (
            <Card
              key={layer?.title}
              size="small"
              className="arch-layer-card"
              title={
                <span>
                  <Tag color={LAYER_COLORS[i % LAYER_COLORS.length]}>{layer?.title}</Tag>
                  {layer?.subtitle && (
                    <span style={{ color: '#888', fontWeight: 400, fontSize: 12 }}>
                      {layer.subtitle}
                    </span>
                  )}
                </span>
              }
            >
              <div
                className="arch-columns"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
              >
                {columns.map((col) => (
                  <ColumnBlock key={col?.title} column={col} />
                ))}
              </div>
            </Card>
            );
          })}
        </div>
        {data?.side && <SideColumn column={data.side} />}
      </div>
      <div style={{ color: SIDE_COLOR, marginTop: 8, fontSize: 12 }}>
        右侧为预算管控主线，与各层活动贯穿衔接。
      </div>
    </div>
  );
}
