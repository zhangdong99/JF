import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Collapse,
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
  createProduct,
  deleteProduct,
  fetchDomains,
  fetchProducts,
  updateProduct,
} from '@/api/catalog';
import type { FormInstance } from 'antd';
import type { ID, Product, ProductDomain, ProductStatus } from '@/types';

const STATUS_META: Record<ProductStatus, { label: string; color: string }> = {
  active: { label: '在营', color: 'green' },
  planning: { label: '规划中', color: 'blue' },
  deprecated: { label: '已退役', color: 'default' },
};

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));

function ProductForm({ form, domains }: { form: FormInstance; domains: ProductDomain[] }) {
  return (
    <Form form={form} layout="vertical">
      <Form.Item name="code" label="产品编码" rules={[{ required: true, message: '请输入编码' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="domain_id" label="产品域" rules={[{ required: true, message: '请选择产品域' }]}>
        <Select options={domains.map((d) => ({ value: d.id, label: d.name }))} />
      </Form.Item>
      <Form.Item name="owner" label="负责人">
        <Input />
      </Form.Item>
      <Form.Item name="status" label="状态" rules={[{ required: true }]} initialValue="active">
        <Select options={STATUS_OPTIONS} />
      </Form.Item>
      <Form.Item name="description" label="描述">
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form>
  );
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [domains, setDomains] = useState<ProductDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchProducts(), fetchDomains()])
      .then(([ps, ds]) => {
        setProducts(ps);
        setDomains(ds);
      })
      .catch(() => {
        setProducts([]);
        setDomains([]);
        setError('后端服务不可用（GET /api/v1/products），暂无数据。');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const grouped = useMemo(() => {
    const map = new Map<ID, Product[]>();
    for (const p of products) {
      const list = map.get(p.domain_id) ?? [];
      list.push(p);
      map.set(p.domain_id, list);
    }
    return map;
  }, [products]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: Product) => {
    setEditing(record);
    form.setFieldsValue(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateProduct(editing.id, values);
      message.success('保存成功');
    } else {
      await createProduct(values);
      message.success('创建成功');
    }
    setDrawerOpen(false);
    load();
  };

  const handleDelete = async (id: ID) => {
    await deleteProduct(id);
    message.success('已删除');
    load();
  };

  const columns: ColumnsType<Product> = [
    { title: '编码', dataIndex: 'code', width: 140 },
    { title: '名称', dataIndex: 'name', width: 200 },
    { title: '负责人', dataIndex: 'owner', width: 120, render: (v) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: ProductStatus) => (
        <Tag color={STATUS_META[s]?.color ?? 'default'}>{STATUS_META[s]?.label ?? s}</Tag>
      ),
    },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该产品？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const collapseItems = domains.map((domain) => ({
    key: String(domain.id),
    label: (
      <Space>
        <Tag color="blue">{domain.name}</Tag>
        <span style={{ color: '#999' }}>{(grouped.get(domain.id) ?? []).length} 个产品</span>
      </Space>
    ),
    children: (
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={grouped.get(domain.id) ?? []}
        pagination={false}
      />
    ),
  }));

  return (
    <div>
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '8px 12px',
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 6,
          }}
        >
          ⚠️ {error}
        </div>
      )}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<RedoOutlined />} onClick={load}>
          刷新
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={domains.length === 0}>
          新建产品
        </Button>
      </Space>

      {domains.length === 0 && !loading ? (
        <Table rowKey="id" columns={columns} dataSource={[]} loading={loading} pagination={false} />
      ) : (
        <Collapse defaultActiveKey={domains.slice(0, 1).map((d) => String(d.id))} items={collapseItems} />
      )}

      <Drawer
        title={editing ? '编辑产品' : '新建产品'}
        width={460}
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
        <ProductForm form={form} domains={domains} />
      </Drawer>
    </div>
  );
}
