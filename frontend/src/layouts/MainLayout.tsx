import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AutoComplete, Avatar, Badge, Dropdown, Input, Layout, Menu, Space, theme } from 'antd'
import {
  AccountBookOutlined,
  BankOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FileTextOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MailOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuthStore, isHrOrAdmin, isManagerOrAbove } from '../store/auth'
import { searchApi, type SearchResultItem } from '../api/search'
import { leaveApi } from '../api/leave'
import { mailApi } from '../api/mail'
import { projectApi } from '../api/project'
import { expenseApi } from '../api/expense'

const SEARCH_TYPE_ICON: Record<string, React.ReactNode> = {
  user: <UserOutlined />,
  wiki: <BookOutlined />,
  project: <ProjectOutlined />,
  issue: <FileTextOutlined />,
}

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/company', icon: <BankOutlined />, label: '公司信息' },
  { key: '/profile', icon: <UserOutlined />, label: '我的信息' },
  { key: '/departments', icon: <TeamOutlined />, label: '组织架构' },
  { key: '/leaves', icon: <CalendarOutlined />, label: '请假管理' },
  { key: '/expenses', icon: <AccountBookOutlined />, label: '报销管理' },
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
  const canApprove = isManagerOrAbove(user)
  const canMarkPaid = isHrOrAdmin(user)

  const [searchValue, setSearchValue] = useState('')
  const [searchOptions, setSearchOptions] = useState<{ value: string; label: React.ReactNode; item: SearchResultItem }[]>(
    [],
  )

  const [pendingLeaveCount, setPendingLeaveCount] = useState(0)
  const [unreadMailCount, setUnreadMailCount] = useState(0)
  const [myIssueCount, setMyIssueCount] = useState(0)
  const [pendingExpenseCount, setPendingExpenseCount] = useState(0)
  const [payableExpenseCount, setPayableExpenseCount] = useState(0)

  const selectedKey = useMemo(() => {
    const matched = menuItems.find((item) => location.pathname.startsWith(item.key))
    return matched ? [matched.key] : []
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const loadNotificationCounts = () => {
    if (canApprove) {
      leaveApi.list({ status: 'pending' }).then((res) => setPendingLeaveCount(res.data.length))
      expenseApi.list({ status: 'pending' }).then((res) => setPendingExpenseCount(res.data.length))
    }
    if (canMarkPaid) {
      expenseApi.list({ status: 'approved' }).then((res) => setPayableExpenseCount(res.data.length))
    }
    mailApi.unreadCount().then((res) => setUnreadMailCount(res.data.count))
    projectApi.myIssues().then((res) => setMyIssueCount(res.data.length))
  }

  useEffect(() => {
    loadNotificationCounts()
    const timer = window.setInterval(loadNotificationCounts, 60000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove, canMarkPaid])

  useEffect(() => {
    const keyword = searchValue.trim()
    if (!keyword) {
      setSearchOptions([])
      return
    }
    const timer = window.setTimeout(() => {
      searchApi.search(keyword).then((res) => {
        setSearchOptions(
          res.data.map((item) => ({
            value: `${item.type}-${item.id}`,
            item,
            label: (
              <Space>
                {SEARCH_TYPE_ICON[item.type]}
                <span>{item.title}</span>
                {item.subtitle && <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>{item.subtitle}</span>}
              </Space>
            ),
          })),
        )
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchValue])

  const handleSearchSelect = (_value: string, option: { item: SearchResultItem }) => {
    navigate(option.item.link)
    setSearchValue('')
    setSearchOptions([])
  }

  const notificationItems = [
    canApprove
      ? {
          key: 'leaves',
          icon: <CalendarOutlined />,
          label: `待我审批的请假（${pendingLeaveCount}）`,
          onClick: () => navigate('/leaves'),
        }
      : null,
    canApprove
      ? {
          key: 'expenses',
          icon: <AccountBookOutlined />,
          label: `待我审批的报销（${pendingExpenseCount}）`,
          onClick: () => navigate('/expenses'),
        }
      : null,
    canMarkPaid
      ? {
          key: 'expenses-pay',
          icon: <AccountBookOutlined />,
          label: `待付款的报销（${payableExpenseCount}）`,
          onClick: () => navigate('/expenses'),
        }
      : null,
    {
      key: 'mails',
      icon: <MailOutlined />,
      label: `未读邮件（${unreadMailCount}）`,
      onClick: () => navigate('/mails'),
    },
    {
      key: 'issues',
      icon: <ProjectOutlined />,
      label: `我的待办工单（${myIssueCount}）`,
      onClick: () => navigate('/projects'),
    },
  ].filter((item): item is NonNullable<typeof item> => !!item)

  const notificationTotal =
    (canApprove ? pendingLeaveCount + pendingExpenseCount : 0) + (canMarkPaid ? payableExpenseCount : 0) + unreadMailCount

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} className="app-sider">
        <div
          className="app-sider-brand"
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
        <div className="app-sider-menu">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKey}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <AutoComplete
            style={{ width: 320 }}
            options={searchOptions}
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleSearchSelect}
            popupMatchSelectWidth={360}
          >
            <Input placeholder="搜索员工、项目、工单、知识库文档" prefix={<SearchOutlined />} allowClear />
          </AutoComplete>
          <Space size="large">
            <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight">
              <Badge count={notificationTotal} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Badge>
            </Dropdown>
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
          </Space>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
