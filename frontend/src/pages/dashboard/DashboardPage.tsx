import { useEffect, useState } from 'react'
import { Card, Col, List, Row, Space, Statistic, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { CalendarOutlined, MailOutlined, ProjectOutlined, PushpinFilled, ScheduleOutlined } from '@ant-design/icons'
import { leaveApi } from '../../api/leave'
import { attendanceApi } from '../../api/attendance'
import { projectApi } from '../../api/project'
import { mailApi } from '../../api/mail'
import { companyApi } from '../../api/company'
import type { AnnouncementOut } from '../../api/types'
import { isManagerOrAbove, useAuthStore } from '../../store/auth'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const canApprove = isManagerOrAbove(user)

  const [leaveCount, setLeaveCount] = useState(0)
  const [attendanceDays, setAttendanceDays] = useState(0)
  const [myIssueCount, setMyIssueCount] = useState(0)
  const [unreadMailCount, setUnreadMailCount] = useState(0)
  const [announcements, setAnnouncements] = useState<AnnouncementOut[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = dayjs()
    const loadAll = async () => {
      setLoading(true)
      try {
        const [leaveRes, attendanceRes, issueRes, mailRes, announcementRes] = await Promise.all([
          canApprove ? leaveApi.list({ status: 'pending' }) : leaveApi.mine(),
          attendanceApi.mine({ year: now.year(), month: now.month() + 1 }),
          projectApi.myIssues(),
          mailApi.unreadCount(),
          companyApi.listAnnouncements(),
        ])
        setLeaveCount(
          canApprove ? leaveRes.data.length : leaveRes.data.filter((item) => item.status === 'pending').length,
        )
        setAttendanceDays(attendanceRes.data.filter((item) => !!item.clock_in_at).length)
        setMyIssueCount(issueRes.data.length)
        setUnreadMailCount(mailRes.data.count)
        setAnnouncements(announcementRes.data.slice(0, 5))
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [canApprove])

  return (
    <div>
      <Typography.Title level={4}>欢迎回来，{user?.display_name ?? ''}</Typography.Title>
      <Typography.Paragraph type="secondary">这里是您的工作台，汇总了请假、签到、看板与邮件的实时数据。</Typography.Paragraph>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title={canApprove ? '待我审批的请假' : '我的待处理请假'}
              value={leaveCount}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="本月签到天数" value={attendanceDays} prefix={<ScheduleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="我的待办工单" value={myIssueCount} prefix={<ProjectOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title="未读邮件" value={unreadMailCount} prefix={<MailOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card title="最新公告" loading={loading}>
        <List
          dataSource={announcements}
          locale={{ emptyText: '暂无公告' }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    {item.pinned && (
                      <Tag icon={<PushpinFilled />} color="red">
                        置顶
                      </Tag>
                    )}
                    {item.title}
                  </Space>
                }
                description={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.created_by_name ?? '系统'} · {new Date(item.created_at).toLocaleString()}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
