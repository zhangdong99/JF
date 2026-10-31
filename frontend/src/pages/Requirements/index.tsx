import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';
import { fetchProducts } from '@/api/catalog';
import {
  createRequirement,
  deleteRequirement,
  fetchRequirements,
  updateRequirement,
} from '@/api/governance';
import type {
  ID,
  Product,
  RequirementDecision,
  RequirementItem,
  RequirementScoreInput,
  RequirementStatus,
} from '@/types';

const DECISION_META: Record<RequirementDecision, { color: string }> = {
  复用: { color: 'green' },
  扩展: { color: 'blue' },
  跨产品协同: { color: 'purple' },
  新建论证: { color: 'orange' },
  驳回: { color: 'red' },
};

const STATUS_META: Record<RequirementStatus, { label: string; color: string }> = {
  pending: { label: '待评审', color: 'default' },
  approved: { label: '已准入', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
  implementing: { label: '实施中', color: 'blue' },
  done: { label: '已完成', color: 'gray' },
};

const DECISION_OPTIONS = (Object.keys(DECISION_META) as RequirementDecision[]).map((v) => ({ value: v, label: v }));
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));

/** 六项评分维度：前端权重用于即时预览，最终以后端计算为准 */
const DIMENSIONS: { name: keyof RequirementScoreInput; label: string; weight: number }[] = [
  { name: 'business_value', label: '业务价值', weight: 0.3 },
  { name: 'urgency_compliance', label: '紧急合规', weight: 0.2 },
  { name: 'reuse_match', label: '复用匹配', weight: 0.2 },
  { name: 'cost_benefit', label: '成本收益', weight: 0.15 },
  { name: 'tech_feasibility', label: '技术可行', weight: 0.1 },
  { name: 'collaboration_impact', label: '协同影响', weight: 0.05 },
];

function CreateForm({
  form,
  products,
  scores,
}: {
  form: ReturnType<typeof Form.useForm>[0];
  products: Product[];
  scores: Partial<RequirementScoreInput>;
}) {
  const weighted = DIMENSIONS.reduce(
    (sum, d) => sum + ((scores[d.name] as number | undefined) ?? 0) * d.weight,
    0,
  );
  return (
    <Form form={form} layout="vertical">
      <Form.Item name="code" label="需求编码" rules={[{ required: true, message: '请输入编码' }]}>
        <Input placeholder="如 REQ-2026-001" />
      </Form.Item>
      <Form.Item name="name" label="需求名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="main_product_id" label="主责产品">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="选择主责产品"
          options={products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))}
        />
      </Form.Item>
      <Form.Item name="decision" label="决策" initialValue="新建论证">
        <Select options={DECISION_OPTIONS} />
      </Form.Item>
      <Form.Item name="description" label="描述">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Typography.Title level={5}>六项评分（0-100）</Typography.Title>
      {DIMENSIONS.map((d) => (
        <Form.Item
          key={d.name}
          name={['scores', d.name]}
          label={`${d.label}（权重 ${(d.weight * 100).toFixed(0)}%）`}
          rules={[{ required: true, message: `请输入${d.label}得分` }]}
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
      ))}
      <Alert
        type="info"
        showIcon
        message={`加权预览总分：${weighted.toFixed(2)} 分（最终以提交后端计算为准）`}
      />
    </Form>
  );
}

export default function Requirements() {
  const [items, setItems] = useState<RequirementItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scores, setScores] = useState<Partial<RequirementScoreInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    setError(null);
    fetchRequirements()
      .then(setItems)
      .catch(() => {
        setItems([]);
        setError('后端服务不可用（GET /api/v1/requirements），暂无数据。');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const productMap = useMemo(
    () => new Map<ID, Product>(products.map((p) => [p.id, p])),
    [products],
  );

  const handleCreate = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await createRequirement(values);
      message.success('需求创建成功');
      setModalOpen(false);
      form.resetFields();
      setScores({});
      load();
    } catch {
      // 拦截器已提示
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecisionChange = async (record: RequirementItem, decision: RequirementDecision) => {
    await updateRequirement(record.id, { decision });
    message.success('决策已更新');
    load();
  };

  const columns: ColumnsType<RequirementItem> = [
    { title: '编码', dataIndex: 'code', width: 140 },
    { title: '名称', dataIndex: 'name', width: 220 },
    {
      title: '主责产品',
      dataIndex: 'main_product_id',
      width: 150,
      render: (id: ID) => productMap.get(id)?.name ?? recordProductName(items, id),
    },
    {
      title: '加权总分',
      dataIndex: 'weighted_score',
      width: 100,
      sorter: (a, b) => (a.weighted_score ?? 0) - (b.weighted_score ?? 0),
      render: (v) => (v == null ? '-' : v.toFixed?.(2) ?? v),
    },
    {
      title: '决策',
      dataIndex: 'decision',
      width: 180,
      render: (d: RequirementDecision | null, record) =>
        d ? (
          <Select
            size="small"
            value={d}
            style={{ width: 130 }}
            options={DECISION_OPTIONS}
            onChange={(v) => handleDecisionChange(record, v)}
          />
        ) : (
          <Select
            size="small"
            placeholder="设置决策"
            style={{ width: 130 }}
            options={DECISION_OPTIONS}
            onChange={(v) => handleDecisionChange(record, v)}
          />
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: RequirementStatus) => (
        <Tag color={STATUS_META[s]?.color ?? 'default'}>{STATUS_META[s]?.label ?? s}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm title="确认删除该需求？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const handleDelete = async (id: ID) => {
    await deleteRequirement(id);
    message.success('已删除');
    load();
  };

  return (
    <div>
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<RedoOutlined />} onClick={load}>
          刷新
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建需求
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 900 }}
        pagination={{ showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title="新建需求"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setScores({});
        }}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="提交"
        width={560}
        destroyOnClose
      >
        <Form.Provider
          onFormChange={() => {
            setScores(form.getFieldValue('scores') ?? {});
          }}
        >
          <CreateForm form={form} products={products} scores={scores} />
        </Form.Provider>
      </Modal>
    </div>
  );
}

function recordProductName(items: RequirementItem[], id: ID) {
  return items.find((i) => i.main_product_id === id)?.main_product_name ?? '-';
}
