import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { PlusOutlined } from '@ant-design/icons'
import { leaveApi, type LeaveCreatePayload } from '../../api/leave'
import type { AnnualLeaveBalance, LeaveRequestOut } from '../../api/types'
import { isManagerOrAbove, useAuthStore } from '../../store/auth'

const { RangePicker } = DatePicker

const LEAVE_TYPE_OPTIONS = [
  { value: 'annual', label: '年假' },
  { value: 'sick', label: '病假' },
  { value: 'personal', label: '事假' },
  { value: 'compensatory', label: '调休' },
  { value: 'other', label: '其他' },
]

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审批', color: 'gold' },
  approved: { text: '已批准', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
  cancelled: { text: '已取消', color: 'default' },
}

function leaveTypeLabel(value: string): string {
  return LEAVE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value
}

function formatDays(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '')
}

interface LeaveFormValues {
  leave_type: string
  range: [Dayjs, Dayjs]
  days: number
  reason?: string
}

export default function LeavesPage() {
  const user = useAuthStore((state) => state.user)
  const canApprove = isManagerOrAbove(user)

  const [myLeaves, setMyLeaves] = useState<LeaveRequestOut[]>([])
  const [myLoading, setMyLoading] = useState(true)
  const [balance, setBalance] = useState<AnnualLeaveBalance | null>(null)
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequestOut[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [form] = Form.useForm<LeaveFormValues>()

  const [decisionTarget, setDecisionTarget] = useState<{ leave: LeaveRequestOut; action: 'approve' | 'reject' } | null>(
    null,
  )
  const [decisionForm] = Form.useForm<{ comment?: string }>()
  const [decisionSaving, setDecisionSaving] = useState(false)

  const loadBalance = async () => {
    const res = await leaveApi.balance()
    setBalance(res.data)
  }

  const loadMine = async () => {
    setMyLoading(true)
    try {
      const res = await leaveApi.mine()
      setMyLeaves(res.data)
    } finally {
      setMyLoading(false)
    }
  }

  const loadPending = async () => {
    if (!canApprove) return
    setPendingLoading(true)
    try {
      const res = await leaveApi.list({ status: 'pending' })
      setPendingLeaves(res.data)
    } finally {
      setPendingLoading(false)
    }
  }

  useEffect(() => {
    loadBalance()
    loadMine()
    loadPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    form.resetFields()
    setCreateOpen(true)
  }

  const handleRangeChange = (range: [Dayjs | null, Dayjs | null] | null) => {
    if (range && range[0] && range[1]) {
      const diff = range[1].diff(range[0], 'day') + 1
      form.setFieldValue('days', diff)
    }
  }

  const handleCreate = async (values: LeaveFormValues) => {
    setCreateSaving(true)
    try {
      const payload: LeaveCreatePayload = {
        leave_type: values.leave_type,
        start_date: values.range[0].format('YYYY-MM-DD'),
        end_date: values.range[1].format('YYYY-MM-DD'),
        days: values.days,
        reason: values.reason,
      }
      await leaveApi.create(payload)
      message.success('请假申请已提交')
      setCreateOpen(false)
      loadBalance()
      loadMine()
      loadPending()
    } finally {
      setCreateSaving(false)
    }
  }

  const handleCancel = async (id: number) => {
    await leaveApi.cancel(id)
    message.success('请假申请已取消')
    loadBalance()
    loadMine()
    loadPending()
  }

  const openDecision = (leave: LeaveRequestOut, action: 'approve' | 'reject') => {
    decisionForm.resetFields()
    setDecisionTarget({ leave, action })
  }

  const handleDecision = async (values: { comment?: string }) => {
    if (!decisionTarget) return
    setDecisionSaving(true)
    try {
      if (decisionTarget.action === 'approve') {
        await leaveApi.approve(decisionTarget.leave.id, values)
        message.success('已批准')
      } else {
        await leaveApi.reject(decisionTarget.leave.id, values)
        message.success('已拒绝')
      }
      setDecisionTarget(null)
      loadBalance()
      loadMine()
      loadPending()
    } finally {
      setDecisionSaving(false)
    }
  }

  const myColumns: ColumnsType<LeaveRequestOut> = [
    { title: '类型', dataIndex: 'leave_type', render: leaveTypeLabel, width: 90 },
    {
      title: '起止日期',
      render: (_, record) => `${record.start_date} ~ ${record.end_date}`,
    },
    { title: '天数', dataIndex: 'days', width: 70 },
    { title: '事由', dataIndex: 'reason', ellipsis: true, render: (v) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => <Tag color={STATUS_MAP[status]?.color}>{STATUS_MAP[status]?.text ?? status}</Tag>,
    },
    { title: '审批意见', dataIndex: 'approve_comment', render: (v) => v || '-' },
    {
      title: '操作',
      width: 90,
      render: (_, record) =>
        record.status === 'pending' ? (
          <Popconfirm title="确定取消该申请？" onConfirm={() => handleCancel(record.id)}>
            <Button type="link" danger>
              取消
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  const approveColumns: ColumnsType<LeaveRequestOut> = [
    { title: '申请人', render: (_, record) => record.user.display_name, width: 100 },
    { title: '类型', dataIndex: 'leave_type', render: leaveTypeLabel, width: 90 },
    {
      title: '起止日期',
      render: (_, record) => `${record.start_date} ~ ${record.end_date}`,
    },
    { title: '天数', dataIndex: 'days', width: 70 },
    { title: '事由', dataIndex: 'reason', ellipsis: true, render: (v) => v || '-' },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openDecision(record, 'approve')}>
            批准
          </Button>
          <Button type="link" danger onClick={() => openDecision(record, 'reject')}>
            拒绝
          </Button>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'mine',
      label: '我的请假',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              申请请假
            </Button>
          </Space>
          <Table
            rowKey="id"
            columns={myColumns}
            dataSource={myLeaves}
            loading={myLoading}
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
  ]

  if (canApprove) {
    tabItems.push({
      key: 'approve',
      label: `待我审批${pendingLeaves.length ? ` (${pendingLeaves.length})` : ''}`,
      children: (
        <Table
          rowKey="id"
          columns={approveColumns}
          dataSource={pendingLeaves}
          loading={pendingLoading}
          pagination={{ pageSize: 10 }}
        />
      ),
    })
  }

  return (
    <div>
      <Typography.Title level={4}>请假管理</Typography.Title>
      {balance && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} md={4}>
              <Statistic title="当前可请年假" value={formatDays(balance.total_available)} suffix="天" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Statistic title={`${balance.year} 年额度`} value={formatDays(balance.grant_days)} suffix="天" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Statistic title="本年已占用" value={formatDays(balance.used_days)} suffix="天" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Statistic title="本年剩余" value={formatDays(balance.remaining_days)} suffix="天" />
            </Col>
            {balance.carryover_active && (
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title={`上年结转（至 ${balance.carryover_deadline}）`}
                  value={formatDays(balance.carryover_days)}
                  suffix="天"
                />
              </Col>
            )}
            {balance.carryover_expired_days > 0 && (
              <Col xs={12} sm={8} md={4}>
                <Statistic title="上年结转已清零" value={formatDays(balance.carryover_expired_days)} suffix="天" />
              </Col>
            )}
          </Row>
          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            title={`每人每年 ${formatDays(balance.grant_days)} 天年假，其中最多 ${formatDays(balance.carryover_limit_days)} 天可结转至次年 3 月 31 日。到期仍未使用的结转余额自动清零，申请年假时优先扣减这部分假期。已占用含待审批申请。`}
          />
        </Card>
      )}
      <Tabs items={tabItems} />

      <Modal
        title="申请请假"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createSaving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ leave_type: 'annual' }}>
          <Form.Item name="leave_type" label="请假类型" rules={[{ required: true, message: '请选择请假类型' }]}>
            <Select options={LEAVE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="range" label="起止日期" rules={[{ required: true, message: '请选择起止日期' }]}>
            <RangePicker style={{ width: '100%' }} onChange={handleRangeChange} />
          </Form.Item>
          <Form.Item
            name="days"
            label="请假天数"
            rules={[{ required: true, message: '请输入请假天数' }]}
            initialValue={1}
          >
            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="请假事由">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={decisionTarget?.action === 'approve' ? '批准请假申请' : '拒绝请假申请'}
        open={!!decisionTarget}
        onCancel={() => setDecisionTarget(null)}
        onOk={() => decisionForm.submit()}
        confirmLoading={decisionSaving}
        destroyOnHidden
      >
        <Form form={decisionForm} layout="vertical" onFinish={handleDecision}>
          <Form.Item name="comment" label="审批意见">
            <Input.TextArea rows={3} placeholder="可选填写审批意见" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
