import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createPlan, fetchPlans } from '@/api/plans';
import type { PlanListItem, PlanStatus } from '@/types';

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  reviewing: { label: '评审中', color: 'blue' },
  approved: { label: '已批准', color: 'green' },
  archived: { label: '已归档', color: 'default' },
};

const CATEGORY_OPTIONS = ['业务规划', '技术方案', '治理方案', '运营方案'].map((c) => ({
  value: c,
  label: c,
}));

function statusMeta(s: string) {
  return STATUS_META[s] ?? { label: s, color: 'default' };
}

function PlanForm() {
  return (
    <Form layout="vertical">
      <Form.Item name="title" label="方案标题" rules={[{ required: true, message: '请输入方案标题' }]}>
        <Input placeholder="例如：XX 业务整合优化方案" />
      </Form.Item>
      <Form.Item name="category" label="类别" rules={[{ required: true, message: '请选择类别' }]}>
        <Select options={CATEGORY_OPTIONS} placeholder="请选择类别" />
      </Form.Item>
      <Form.Item
        name="related_domains"
        label="关联产品域"
        tooltip="多个域用英文逗号分隔，例如：需求运营,产品运营"
      >
        <Input placeholder="需求运营,产品运营" />
      </Form.Item>
      <Form.Item name="owner" label="负责人">
        <Input />
      </Form.Item>
      <Form.Item name="owner_email" label="负责人邮箱">
        <Input />
      </Form.Item>
      <Form.Item name="content_md" label="方案内容（Markdown）">
        <Input.TextArea rows={10} style={{ fontFamily: 'Consolas, Menlo, monospace' }} />
      </Form.Item>
    </Form>
  );
}

export default function Plans() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PlanListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(
    (p = page, kw = keyword, cat = category) => {
      setLoading(true);
      setError(null);
      fetchPlans({ page: p, page_size: pageSize, keyword: kw || undefined, category: cat })
        .then((res) => {
          setItems(res.items ?? []);
          setTotal(res.total ?? 0);
        })
        .catch(() => {
          setItems([]);
          setTotal(0);
          setError('后端服务不可用（GET /api/v1/plans），暂无数据。');
        })
        .finally(() => setLoading(false));
    },
    [page, keyword, category],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category]);

  const handleSearch = () => {
    setPage(1);
    load(1, keyword, category);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    await createPlan(values);
    message.success('创建成功');
    setDrawerOpen(false);
    form.resetFields();
    load();
  };

  const columns: ColumnsType<PlanListItem> = [
    { title: '标题', dataIndex: 'title', width: 240, ellipsis: true },
    {
      title: '类别',
      dataIndex: 'category',
      width: 110,
      render: (v: string) => <Tag color="geekblue">{v}</Tag>,
    },
    {
      title: '关联域',
      dataIndex: 'related_domains',
      width: 200,
      ellipsis: true,
      render: (v?: string) =>
        v
          ? String(v)
              .split(',')
              .filter(Boolean)
              .map((d) => (
                <Tag key={d} style={{ marginBottom: 2 }}>
                  {d.trim()}
                </Tag>
              ))
          : '-',
    },
    { title: '负责人', dataIndex: 'owner', width: 100, render: (v) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => {
        const m = statusMeta(s);
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    { title: '版本数', dataIndex: 'version_count', width: 80, align: 'center' },
    {
      title: '待确认建议',
      dataIndex: 'pending_suggestions',
      width: 100,
      align: 'center',
      render: (v: number) => (
        <Badge count={v} size="small" offset={[0, -2]} style={{ position: 'static' }} />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (v: string) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-'),
    },
  ];

  return (
    <div>
      {error && (
        <Alert
          type="warning"
          showIcon
          message="后端服务不可用"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="搜索方案标题"
          style={{ width: 220 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
        />
        <Select
          allowClear
          placeholder="按类别筛选"
          style={{ width: 160 }}
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
            load(1, keyword, v);
          }}
        />
        <Button type="primary" onClick={handleSearch}>
          查询
        </Button>
        <Button icon={<RedoOutlined />} onClick={() => load()}>
          刷新
        </Button>
        <Button
          type="primary"
          ghost
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setDrawerOpen(true);
          }}
        >
          新建方案
        </Button>
      </Space>

      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => setPage(p),
        }}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => navigate(`/plans/${record.id}`),
        })}
      />

      <Drawer
        title="新建方案"
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleCreate}>
              保存
            </Button>
          </Space>
        }
      >
        <PlanForm />
      </Drawer>
    </div>
  );
}

export type { PlanStatus };
