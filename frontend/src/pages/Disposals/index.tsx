import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchSystems } from '@/api/catalog';
import {
  createDisposal,
  deleteDisposal,
  fetchDisposals,
  updateDisposal,
} from '@/api/governance';
import type { DisposalAction, DisposalItem, DisposalStatus, SystemItem } from '@/types';

const ACTION_META: Record<DisposalAction, { color: string }> = {
  整合: { color: 'blue' },
  下线: { color: 'red' },
  改造: { color: 'orange' },
  保留观察: { color: 'green' },
};

const PRIORITY_META: Record<DisposalItem['priority'], { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'green' },
};

const STATUS_META: Record<DisposalStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'default' },
  in_progress: { label: '进行中', color: 'blue' },
  done: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
};

const ACTION_OPTIONS = (Object.keys(ACTION_META) as DisposalAction[]).map((v) => ({ value: v, label: v }));
const PRIORITY_OPTIONS = Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }));
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));

function DisposalForm({
  form,
  systems,
}: {
  form: ReturnType<typeof Form.useForm>[0];
  systems: SystemItem[];
}) {
  return (
    <Form form={form} layout="vertical">
      <Form.Item name="system_id" label="系统" rules={[{ required: true, message: '请选择系统' }]}>
        <Select
          showSearch
          optionFilterProp="label"
          options={systems.map((s) => ({ value: s.id, label: `${s.code} ${s.name}` }))}
        />
      </Form.Item>
      <Form.Item name="action" label="处置动作" rules={[{ required: true, message: '请选择动作' }]}>
        <Select options={ACTION_OPTIONS} />
      </Form.Item>
      <Form.Item name="priority" label="优先级" initialValue="medium" rules={[{ required: true }]}>
        <Select options={PRIORITY_OPTIONS} />
      </Form.Item>
      <Form.Item name="reason" label="处置原因">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="risk" label="风险说明">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="target_date" label="目标日期">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="status" label="状态" initialValue="pending" rules={[{ required: true }]}>
        <Select options={STATUS_OPTIONS} />
      </Form.Item>
    </Form>
  );
}

export default function Disposals() {
  const [items, setItems] = useState<DisposalItem[]>([]);
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DisposalItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    setError(null);
    fetchDisposals()
      .then(setItems)
      .catch(() => {
        setItems([]);
        setError('后端服务不可用（GET /api/v1/disposals），暂无数据。');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetchSystems({ page: 1, page_size: 200 }).then((r) => setSystems(r.items ?? [])).catch(() => setSystems([]));
  }, []);

  const systemMap = new Map(systems.map((s) => [s.id, s]));

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: DisposalItem) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      target_date: record.target_date ? dayjs(record.target_date) : undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      target_date: values.target_date ? values.target_date.format('YYYY-MM-DD') : undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateDisposal(editing.id, payload);
        message.success('保存成功');
      } else {
        await createDisposal(payload);
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch {
      // 拦截器已提示
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: DisposalItem['id']) => {
    await deleteDisposal(id);
    message.success('已删除');
    load();
  };

  const columns: ColumnsType<DisposalItem> = [
    {
      title: '系统',
      dataIndex: 'system_id',
      width: 200,
      render: (id, r) => r.system_name ?? systemMap.get(id)?.name ?? '-',
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 110,
      render: (a: DisposalAction) => <Tag color={ACTION_META[a]?.color}>{a}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      render: (p: DisposalItem['priority']) => (
        <Tag color={PRIORITY_META[p]?.color}>{PRIORITY_META[p]?.label ?? p}</Tag>
      ),
    },
    { title: '原因', dataIndex: 'reason', ellipsis: true, render: (v) => v || '-' },
    { title: '风险', dataIndex: 'risk', ellipsis: true, render: (v) => v || '-' },
    { title: '目标日期', dataIndex: 'target_date', width: 110, render: (v) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: DisposalStatus) => (
        <Tag color={STATUS_META[s]?.color}>{STATUS_META[s]?.label ?? s}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该处置记录？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<RedoOutlined />} onClick={load}>
          刷新
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建处置
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1000 }}
        pagination={{ showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editing ? '编辑处置' : '新建处置'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText="保存"
        destroyOnClose
      >
        <DisposalForm form={form} systems={systems} />
      </Modal>
    </div>
  );
}
