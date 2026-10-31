import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  InputNumber,
  Modal,
  Progress,
  Row,
  Space,
  Tag,
  message,
} from 'antd';
import { RedoOutlined } from '@ant-design/icons';
import { fetchIndicators, updateIndicator } from '@/api/governance';
import type { Indicator } from '@/types';

export default function Indicators() {
  const [items, setItems] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Indicator | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchIndicators()
      .then(setItems)
      .catch(() => {
        setItems([]);
        setError('后端服务不可用（GET /api/v1/indicators），暂无数据。');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const pctOf = (ind: Indicator) =>
    ind.target_value ? Math.min(100, (ind.current_value / ind.target_value) * 100) : 0;

  const handleSave = async () => {
    if (!editing || value == null) return;
    setSaving(true);
    try {
      await updateIndicator(editing.id, { current_value: value });
      message.success('当前值已更新');
      setEditing(null);
      load();
    } catch {
      // 拦截器已提示
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<RedoOutlined />} onClick={load} loading={loading}>
          刷新
        </Button>
      </Space>

      {items.length === 0 && !loading ? (
        <Empty description="暂无治理指标" />
      ) : (
        <Row gutter={[16, 16]}>
          {items.map((ind) => {
            const pct = pctOf(ind);
            return (
              <Col key={ind.code} xs={24} md={12} xl={8}>
                <Card
                  loading={loading}
                  title={
                    <Space>
                      <span>{ind.name}</span>
                      <Tag>{ind.code}</Tag>
                    </Space>
                  }
                  extra={
                    <Button type="link" size="small" onClick={() => { setEditing(ind); setValue(ind.current_value); }}>
                      编辑当前值
                    </Button>
                  }
                >
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                    {ind.current_value}
                    <span style={{ fontSize: 13, color: '#999', fontWeight: 400 }}>
                      {' '}/ {ind.target_value} {ind.unit}
                    </span>
                  </div>
                  <Progress
                    percent={Math.round(pct * 10) / 10}
                    status={pct >= 100 ? 'success' : 'active'}
                  />
                  {ind.description && (
                    <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>{ind.description}</div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title={`编辑当前值 - ${editing?.name ?? ''}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        destroyOnClose
      >
        <div style={{ marginBottom: 8, color: '#666' }}>
          目标值：{editing?.target_value} {editing?.unit}
        </div>
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          value={value ?? undefined}
          onChange={(v) => setValue(v)}
          placeholder="输入当前值"
        />
      </Modal>
    </div>
  );
}
