import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';
import {
  createSystem,
  deleteSystem,
  fetchProducts,
  fetchSystems,
  updateSystem,
} from '@/api/catalog';
import type { Grade, ID, Product, SystemItem, SystemStatus } from '@/types';
import SystemFormDrawer from './SystemFormDrawer';
import ScoreModal from './ScoreModal';

const STATUS_META: Record<SystemStatus, { label: string; color: string }> = {
  running: { label: '运行中', color: 'green' },
  maintenance: { label: '维护中', color: 'blue' },
  offline: { label: '已下线', color: 'default' },
  planning: { label: '规划中', color: 'orange' },
};

export const GRADE_META: Record<Grade, { color: string }> = {
  高价值: { color: 'green' },
  有价值需改善: { color: 'blue' },
  价值存疑: { color: 'orange' },
  低价值候选: { color: 'red' },
};

export default function Systems() {
  const [items, setItems] = useState<SystemItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<SystemStatus | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [products, setProducts] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SystemItem | null>(null);
  const [scoring, setScoring] = useState<SystemItem | null>(null);
  const [form] = Form.useForm();

  const load = (opts?: { page?: number; pageSize?: number; keyword?: string; status?: SystemStatus }) => {
    setLoading(true);
    setError(null);
    const p = opts?.page ?? page;
    const ps = opts?.pageSize ?? pageSize;
    fetchSystems({
      page: p,
      page_size: ps,
      keyword: opts?.keyword ?? (keyword || undefined),
      status: opts?.status ?? status,
    })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
        setError('后端服务不可用（GET /api/v1/systems），暂无数据。');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status]);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: SystemItem) => {
    setEditing(record);
    form.setFieldsValue(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateSystem(editing.id, values);
      message.success('保存成功');
    } else {
      await createSystem(values);
      message.success('创建成功');
    }
    setDrawerOpen(false);
    load();
  };

  const handleDelete = async (id: ID) => {
    await deleteSystem(id);
    message.success('已删除');
    load();
  };

  const columns: ColumnsType<SystemItem> = [
    { title: '编码', dataIndex: 'code', width: 120 },
    { title: '名称', dataIndex: 'name', width: 180 },
    { title: '主归属产品', dataIndex: 'main_product_name', width: 140, render: (v) => v || '-' },
    { title: '部门', dataIndex: 'department', width: 120, render: (v) => v || '-' },
    {
      title: '负责人',
      width: 130,
      render: (_, r) => r.business_owner || r.tech_owner || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: SystemStatus) => <Tag color={STATUS_META[s]?.color ?? 'default'}>{STATUS_META[s]?.label ?? s}</Tag>,
    },
    {
      title: '年度成本(万)',
      dataIndex: 'annual_cost',
      width: 110,
      sorter: (a, b) => (a.annual_cost ?? 0) - (b.annual_cost ?? 0),
      render: (v) => (v == null ? '-' : v),
    },
    {
      title: '最近评分',
      width: 140,
      render: (_, r) =>
        r.latest_score == null ? (
          '-'
        ) : (
          <Space size={4}>
            <span>{r.latest_score}</span>
            {r.latest_grade && <Tag color={GRADE_META[r.latest_grade]?.color}>{r.latest_grade}</Tag>}
          </Space>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => setScoring(record)}>
            评分
          </Button>
          <Popconfirm title="确认删除该系统？" onConfirm={() => handleDelete(record.id)}>
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
      {error && (
        <Alert
          type="warning"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => load({ page: 1 })}>
              重试
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="按编码/名称搜索"
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
            load({ page: 1, keyword: v });
          }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))}
        />
        <Button icon={<RedoOutlined />} onClick={() => load()}>
          刷新
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建系统
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Drawer
        title={editing ? '编辑系统' : '新建系统'}
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <SystemFormDrawer form={form} products={products} />
      </Drawer>

      <ScoreModal
        system={scoring}
        onClose={() => setScoring(null)}
        onSuccess={() => {
          setScoring(null);
          load();
        }}
      />
    </div>
  );
}
