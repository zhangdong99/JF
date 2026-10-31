import { useEffect, useState } from 'react';
import { Form, InputNumber, Modal, Space, Tag, Typography, message } from 'antd';
import { getScoreDimensions, submitSystemScore } from '@/api/catalog';
import type { ScoreDimension, SystemItem } from '@/types';

interface Props {
  system: SystemItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const FALLBACK_DIMENSIONS: ScoreDimension[] = [
  { code: 'strategic', name: '战略匹配度', weight: 0.2 },
  { code: 'business', name: '业务价值', weight: 0.15 },
  { code: 'user', name: '用户体验', weight: 0.1 },
  { code: 'coverage', name: '业务覆盖度', weight: 0.1 },
  { code: 'reuse', name: '复用性', weight: 0.1 },
  { code: 'cost', name: '成本合理性', weight: 0.1 },
  { code: 'tech', name: '技术健康度', weight: 0.1 },
  { code: 'security', name: '安全合规', weight: 0.05 },
  { code: 'data', name: '数据质量', weight: 0.05 },
  { code: 'ops', name: '运维成熟度', weight: 0.05 },
];

/** 十维评分弹窗：0-100 分，展示维度与权重 */
export default function ScoreModal({ system, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [dimensions, setDimensions] = useState<ScoreDimension[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!system) return;
    form.resetFields();
    getScoreDimensions()
      .then(setDimensions)
      .catch(() => setDimensions(FALLBACK_DIMENSIONS));
  }, [system, form]);

  if (!system) return null;

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const result = await submitSystemScore(system.id, { scores: values });
      message.success(`评分提交成功：总分 ${result.total_score}，等级 ${result.grade}`);
      onSuccess();
    } catch {
      // 错误提示由 axios 拦截器统一处理
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`系统评分 - ${system.name}`}
      open
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting || loading}
      okText="提交评分"
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        请为以下 10 个维度打分（0-100 分），提交后由后端按权重计算总分与等级。
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        {dimensions.map((dim) => (
          <Form.Item
            key={dim.code}
            name={dim.code}
            label={
              <Space size={8}>
                <span>{dim.name}</span>
                <Tag color="blue">权重 {(dim.weight * 100).toFixed(0)}%</Tag>
              </Space>
            }
            rules={[{ required: true, message: `请输入「${dim.name}」得分` }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
