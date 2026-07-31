import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Dropdown, Layout, Menu, Space, theme } from 'antd'
import {
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  DashboardOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MailOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/auth'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/company', icon: <BankOutlined />, label: '公司信息' },
  { key: '/profile', icon: <UserOutlined />, label: '我的信息' },
  { key: '/departments', icon: <TeamOutlined />, label: '组织架构' },
  { key: '/leaves', icon: <CalendarOutlined />, label: '请假管理' },
  { key: '/attendance', icon: <ScheduleOutlined />, label: '签到打卡' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Jira看板' },
  { key: '/wiki', icon: <BookOutlined />, label: '知识库' },
  { key: '/mails', icon: <MailOutlined />, label: '邮箱' },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const selectedKey = useMemo(() => {
    const matched = menuItems.find((item) => location.pathname.startsWith(item.key))
    return matched ? [matched.key] : []
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 48,
            margin: 16,
            color: '#fff',
            fontWeight: 600,
            fontSize: collapsed ? 16 : 18,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? '公司' : '公司内部平台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKey}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <IdcardOutlined />, label: '我的信息', onClick: () => navigate('/profile') },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar src={user?.avatar_url ?? undefined} icon={<UserOutlined />} />
              <span>{user?.display_name ?? '未登录'}</span>
              {user?.department?.name && (
                <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>{user.department.name}</span>
              )}
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
