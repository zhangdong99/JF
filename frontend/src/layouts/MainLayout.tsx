import { Layout, Menu, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  ApartmentOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  BulbOutlined,
  SwapOutlined,
  AimOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '总览看板' },
  { key: '/architecture', icon: <ApartmentOutlined />, label: '治理架构总览' },
  { key: '/systems', icon: <DatabaseOutlined />, label: '系统台账' },
  { key: '/products', icon: <AppstoreOutlined />, label: '产品管理' },
  { key: '/requirements', icon: <BulbOutlined />, label: '需求准入' },
  { key: '/disposals', icon: <SwapOutlined />, label: '整合处置' },
  { key: '/indicators', icon: <AimOutlined />, label: '治理指标' },
  { key: '/plans', icon: <FileTextOutlined />, label: '方案管理' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark">
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 1,
          }}
        >
          AI-Office 治理平台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname.startsWith('/plans') ? '/plans' : location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            产品组合治理平台
          </Typography.Title>
        </Header>
        <Content style={{ margin: 16, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
