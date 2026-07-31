import { useEffect, useState } from 'react'
import { Button, Card, DatePicker, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { ClockCircleOutlined } from '@ant-design/icons'
import { attendanceApi } from '../../api/attendance'
import type { AttendanceRecordOut, AttendanceRecordWithUserOut } from '../../api/types'
import { isManagerOrAbove, useAuthStore } from '../../store/auth'

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'green' },
  late: { text: '迟到', color: 'orange' },
  early_leave: { text: '早退', color: 'orange' },
  absent: { text: '缺勤', color: 'red' },
}

function formatTime(value?: string | null): string {
  return value ? dayjs(value).format('HH:mm:ss') : '-'
}

function statusTag(status: string) {
  const info = STATUS_MAP[status] ?? { text: status, color: 'default' }
  return <Tag color={info.color}>{info.text}</Tag>
}

export default function AttendancePage() {
  const user = useAuthStore((state) => state.user)
  const canViewTeam = isManagerOrAbove(user)

  const [today, setToday] = useState<AttendanceRecordOut | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [myRecords, setMyRecords] = useState<AttendanceRecordOut[]>([])
  const [myLoading, setMyLoading] = useState(true)

  const [teamMonth, setTeamMonth] = useState<Dayjs>(dayjs())
  const [teamRecords, setTeamRecords] = useState<AttendanceRecordWithUserOut[]>([])
  const [teamLoading, setTeamLoading] = useState(true)

  const loadToday = async () => {
    setTodayLoading(true)
    try {
      const res = await attendanceApi.today()
      setToday(res.data)
    } finally {
      setTodayLoading(false)
    }
  }

  const loadMine = async (target: Dayjs) => {
    setMyLoading(true)
    try {
      const res = await attendanceApi.mine({ year: target.year(), month: target.month() + 1 })
      setMyRecords(res.data)
    } finally {
      setMyLoading(false)
    }
  }

  const loadTeam = async (target: Dayjs) => {
    if (!canViewTeam) return
    setTeamLoading(true)
    try {
      const res = await attendanceApi.team({ year: target.year(), month: target.month() + 1 })
      setTeamRecords(res.data)
    } finally {
      setTeamLoading(false)
    }
  }

  useEffect(() => {
    loadToday()
    loadMine(month)
    loadTeam(teamMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClockIn = async () => {
    setActionLoading(true)
    try {
      await attendanceApi.clockIn()
      message.success('签到成功')
      loadToday()
      loadMine(month)
    } finally {
      setActionLoading(false)
    }
  }

  const handleClockOut = async () => {
    setActionLoading(true)
    try {
      await attendanceApi.clockOut()
      message.success('签退成功')
      loadToday()
      loadMine(month)
    } finally {
      setActionLoading(false)
    }
  }

  const handleMonthChange = (value: Dayjs | null) => {
    const target = value ?? dayjs()
    setMonth(target)
    loadMine(target)
  }

  const handleTeamMonthChange = (value: Dayjs | null) => {
    const target = value ?? dayjs()
    setTeamMonth(target)
    loadTeam(target)
  }

  const myColumns: ColumnsType<AttendanceRecordOut> = [
    { title: '日期', dataIndex: 'work_date', width: 120 },
    { title: '签到时间', render: (_, record) => formatTime(record.clock_in_at), width: 120 },
    { title: '签退时间', render: (_, record) => formatTime(record.clock_out_at), width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: statusTag },
    { title: '备注', dataIndex: 'note', render: (v) => v || '-' },
  ]

  const teamColumns: ColumnsType<AttendanceRecordWithUserOut> = [
    { title: '姓名', render: (_, record) => record.user.display_name, width: 120 },
    { title: '日期', dataIndex: 'work_date', width: 120 },
    { title: '签到时间', render: (_, record) => formatTime(record.clock_in_at), width: 120 },
    { title: '签退时间', render: (_, record) => formatTime(record.clock_out_at), width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: statusTag },
  ]

  const tabItems = [
    {
      key: 'mine',
      label: '我的打卡',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <DatePicker picker="month" value={month} onChange={handleMonthChange} allowClear={false} />
          </Space>
          <Table rowKey="id" columns={myColumns} dataSource={myRecords} loading={myLoading} pagination={{ pageSize: 15 }} />
        </>
      ),
    },
  ]

  if (canViewTeam) {
    tabItems.push({
      key: 'team',
      label: '团队记录',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <DatePicker picker="month" value={teamMonth} onChange={handleTeamMonthChange} allowClear={false} />
          </Space>
          <Table
            rowKey="id"
            columns={teamColumns}
            dataSource={teamRecords}
            loading={teamLoading}
            pagination={{ pageSize: 15 }}
          />
        </>
      ),
    })
  }

  return (
    <div>
      <Typography.Title level={4}>签到打卡</Typography.Title>
      <Card loading={todayLoading} style={{ marginBottom: 24 }}>
        <Space size="large" align="center">
          <Space direction="vertical" size={0}>
            <Typography.Text type="secondary">今日日期</Typography.Text>
            <Typography.Text strong>{dayjs().format('YYYY-MM-DD dddd')}</Typography.Text>
          </Space>
          <Space direction="vertical" size={0}>
            <Typography.Text type="secondary">签到时间</Typography.Text>
            <Typography.Text strong>{formatTime(today?.clock_in_at)}</Typography.Text>
          </Space>
          <Space direction="vertical" size={0}>
            <Typography.Text type="secondary">签退时间</Typography.Text>
            <Typography.Text strong>{formatTime(today?.clock_out_at)}</Typography.Text>
          </Space>
          {today && <Space direction="vertical" size={0}>
            <Typography.Text type="secondary">状态</Typography.Text>
            {statusTag(today.status)}
          </Space>}
          <Button
            type="primary"
            icon={<ClockCircleOutlined />}
            loading={actionLoading}
            disabled={!!today?.clock_in_at}
            onClick={handleClockIn}
          >
            签到
          </Button>
          <Button
            icon={<ClockCircleOutlined />}
            loading={actionLoading}
            disabled={!today?.clock_in_at || !!today?.clock_out_at}
            onClick={handleClockOut}
          >
            签退
          </Button>
        </Space>
      </Card>
      <Tabs items={tabItems} />
    </div>
  )
}
