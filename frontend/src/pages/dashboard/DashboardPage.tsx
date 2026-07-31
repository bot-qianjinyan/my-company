import { Card, Col, Row, Statistic, Typography } from 'antd'
import { CalendarOutlined, MailOutlined, ProjectOutlined, ScheduleOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../store/auth'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div>
      <Typography.Title level={4}>
        欢迎回来，{user?.display_name ?? ''}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        以下数据将随请假、签到、看板、邮件等模块陆续开发接入真实统计。
      </Typography.Paragraph>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="待处理请假" value={0} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月签到天数" value={0} prefix={<ScheduleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="我的待办工单" value={0} prefix={<ProjectOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="未读邮件" value={0} prefix={<MailOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
