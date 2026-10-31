import { Form, Input, InputNumber, Select, DatePicker } from 'antd';
import type { FormInstance } from 'antd';
import type { Product, SystemStatus } from '@/types';

const STATUS_OPTIONS: { value: SystemStatus; label: string }[] = [
  { value: 'running', label: '运行中' },
  { value: 'maintenance', label: '维护中' },
  { value: 'offline', label: '已下线' },
  { value: 'planning', label: '规划中' },
];

interface Props {
  form: FormInstance;
  products: Product[];
}

/** 系统 新建/编辑 表单（配合外层 Drawer 使用） */
export default function SystemFormDrawer({ form, products }: Props) {
  return (
    <Form form={form} layout="vertical" initialValues={{ status: 'running' }}>
      <Form.Item name="code" label="系统编码" rules={[{ required: true, message: '请输入编码' }]}>
        <Input placeholder="如 SYS-001" />
      </Form.Item>
      <Form.Item name="name" label="系统名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="main_product_id" label="主归属产品">
        <Select
          allowClear
          placeholder="选择主归属产品"
          options={products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))}
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      <Form.Item name="department" label="所属部门">
        <Input />
      </Form.Item>
      <Form.Item name="business_owner" label="业务负责人">
        <Input />
      </Form.Item>
      <Form.Item name="tech_owner" label="技术负责人">
        <Input />
      </Form.Item>
      <Form.Item name="status" label="状态" rules={[{ required: true }]}>
        <Select options={STATUS_OPTIONS} />
      </Form.Item>
      <Form.Item name="annual_cost" label="年度成本（万元）">
        <InputNumber style={{ width: '100%' }} min={0} precision={1} />
      </Form.Item>
      <Form.Item name="user_count" label="用户数">
        <InputNumber style={{ width: '100%' }} min={0} precision={0} />
      </Form.Item>
      <Form.Item name="go_live_date" label="上线日期">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="description" label="描述">
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form>
  );
}
