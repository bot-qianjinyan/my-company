import { useEffect, useState } from 'react'
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { DeleteOutlined, FileTextOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { expenseApi } from '../../api/expense'
import type { ExpenseClaimOut } from '../../api/types'
import { isHrOrAdmin, isManagerOrAbove, useAuthStore } from '../../store/auth'

const CATEGORY_OPTIONS = [
  { value: 'traffic', label: '交通' },
  { value: 'meal', label: '餐饮' },
  { value: 'accommodation', label: '住宿' },
  { value: 'office', label: '办公用品' },
  { value: 'communication', label: '通讯' },
  { value: 'other', label: '其他' },
]

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审批', color: 'gold' },
  approved: { text: '已批准', color: 'blue' },
  rejected: { text: '已拒绝', color: 'red' },
  paid: { text: '已付款', color: 'green' },
  cancelled: { text: '已取消', color: 'default' },
}

function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((item) => item.value === value)?.label ?? value
}

interface ClaimFormValues {
  title: string
  category: string
  amount: number
  expense_date: Dayjs
  description?: string
}

interface InvoiceFormValues {
  invoice_no?: string
  amount?: number
}

export default function ExpensesPage() {
  const user = useAuthStore((state) => state.user)
  const canApprove = isManagerOrAbove(user)
  const canMarkPaid = isHrOrAdmin(user)

  const [myClaims, setMyClaims] = useState<ExpenseClaimOut[]>([])
  const [myLoading, setMyLoading] = useState(true)
  const [pendingClaims, setPendingClaims] = useState<ExpenseClaimOut[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [payableClaims, setPayableClaims] = useState<ExpenseClaimOut[]>([])
  const [payableLoading, setPayableLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [form] = Form.useForm<ClaimFormValues>()

  const [detailClaim, setDetailClaim] = useState<ExpenseClaimOut | null>(null)
  const [invoiceForm] = Form.useForm<InvoiceFormValues>()
  const [pendingFile, setPendingFile] = useState<UploadFile | null>(null)
  const [uploading, setUploading] = useState(false)

  const [decisionTarget, setDecisionTarget] = useState<{ claim: ExpenseClaimOut; action: 'approve' | 'reject' } | null>(
    null,
  )
  const [decisionForm] = Form.useForm<{ comment?: string }>()
  const [decisionSaving, setDecisionSaving] = useState(false)

  const loadMine = async () => {
    setMyLoading(true)
    try {
      const res = await expenseApi.mine()
      setMyClaims(res.data)
    } finally {
      setMyLoading(false)
    }
  }

  const loadPending = async () => {
    if (!canApprove) return
    setPendingLoading(true)
    try {
      const res = await expenseApi.list({ status: 'pending' })
      setPendingClaims(res.data)
    } finally {
      setPendingLoading(false)
    }
  }

  const loadPayable = async () => {
    if (!canMarkPaid) return
    setPayableLoading(true)
    try {
      const res = await expenseApi.list({ status: 'approved' })
      setPayableClaims(res.data)
    } finally {
      setPayableLoading(false)
    }
  }

  const reloadAll = () => {
    loadMine()
    loadPending()
    loadPayable()
  }

  useEffect(() => {
    reloadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    form.resetFields()
    setCreateOpen(true)
  }

  const handleCreate = async (values: ClaimFormValues) => {
    setCreateSaving(true)
    try {
      await expenseApi.create({
        title: values.title,
        category: values.category,
        amount: values.amount,
        expense_date: values.expense_date.format('YYYY-MM-DD'),
        description: values.description,
      })
      message.success('报销申请已提交')
      setCreateOpen(false)
      reloadAll()
    } finally {
      setCreateSaving(false)
    }
  }

  const handleCancel = async (id: number) => {
    await expenseApi.cancel(id)
    message.success('报销申请已取消')
    reloadAll()
  }

  const openDetail = (claim: ExpenseClaimOut) => {
    invoiceForm.resetFields()
    setPendingFile(null)
    setDetailClaim(claim)
  }

  const refreshDetail = async () => {
    if (!detailClaim) return
    const res = await expenseApi.mine()
    setMyClaims(res.data)
    const updated = res.data.find((c) => c.id === detailClaim.id)
    if (updated) setDetailClaim(updated)
  }

  const handleUploadInvoice = async (values: InvoiceFormValues) => {
    if (!detailClaim) return
    if (!pendingFile?.originFileObj) {
      message.warning('请先选择发票文件')
      return
    }
    setUploading(true)
    try {
      await expenseApi.uploadInvoice(detailClaim.id, {
        file: pendingFile.originFileObj as File,
        invoice_no: values.invoice_no,
        amount: values.amount,
      })
      message.success('发票已上传')
      invoiceForm.resetFields()
      setPendingFile(null)
      await refreshDetail()
      reloadAll()
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveInvoice = async (invoiceId: number) => {
    await expenseApi.removeInvoice(invoiceId)
    message.success('发票已删除')
    await refreshDetail()
    reloadAll()
  }

  const openDecision = (claim: ExpenseClaimOut, action: 'approve' | 'reject') => {
    decisionForm.resetFields()
    setDecisionTarget({ claim, action })
  }

  const handleDecision = async (values: { comment?: string }) => {
    if (!decisionTarget) return
    setDecisionSaving(true)
    try {
      if (decisionTarget.action === 'approve') {
        await expenseApi.approve(decisionTarget.claim.id, values)
        message.success('已批准')
      } else {
        await expenseApi.reject(decisionTarget.claim.id, values)
        message.success('已拒绝')
      }
      setDecisionTarget(null)
      reloadAll()
    } finally {
      setDecisionSaving(false)
    }
  }

  const handleMarkPaid = async (id: number) => {
    await expenseApi.markPaid(id)
    message.success('已标记为已付款')
    reloadAll()
  }

  const myColumns: ColumnsType<ExpenseClaimOut> = [
    { title: '事项', dataIndex: 'title', ellipsis: true },
    { title: '类别', dataIndex: 'category', width: 90, render: categoryLabel },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '发生日期', dataIndex: 'expense_date', width: 110 },
    { title: '发票数', width: 80, render: (_, record) => record.invoices.length },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => <Tag color={STATUS_MAP[status]?.color}>{STATUS_MAP[status]?.text ?? status}</Tag>,
    },
    { title: '审批意见', dataIndex: 'approve_comment', ellipsis: true, render: (v) => v || '-' },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openDetail(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Popconfirm title="确定取消该申请？" onConfirm={() => handleCancel(record.id)}>
              <Button type="link" danger>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const approveColumns: ColumnsType<ExpenseClaimOut> = [
    { title: '申请人', render: (_, record) => record.user.display_name, width: 100 },
    { title: '事项', dataIndex: 'title', ellipsis: true },
    { title: '类别', dataIndex: 'category', width: 90, render: categoryLabel },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '发生日期', dataIndex: 'expense_date', width: 110 },
    { title: '发票数', width: 80, render: (_, record) => record.invoices.length },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openDetail(record)}>
            查看发票
          </Button>
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

  const payableColumns: ColumnsType<ExpenseClaimOut> = [
    { title: '申请人', render: (_, record) => record.user.display_name, width: 100 },
    { title: '事项', dataIndex: 'title', ellipsis: true },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '批准时间', dataIndex: 'approved_at', width: 170, render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-') },
    {
      title: '操作',
      width: 140,
      render: (_, record) => (
        <Popconfirm title="确认已完成付款？" onConfirm={() => handleMarkPaid(record.id)}>
          <Button type="link">标记已付款</Button>
        </Popconfirm>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'mine',
      label: '我的报销',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              申请报销
            </Button>
          </Space>
          <Table rowKey="id" columns={myColumns} dataSource={myClaims} loading={myLoading} pagination={{ pageSize: 10 }} />
        </>
      ),
    },
  ]

  if (canApprove) {
    tabItems.push({
      key: 'approve',
      label: `待我审批${pendingClaims.length ? ` (${pendingClaims.length})` : ''}`,
      children: (
        <Table
          rowKey="id"
          columns={approveColumns}
          dataSource={pendingClaims}
          loading={pendingLoading}
          pagination={{ pageSize: 10 }}
        />
      ),
    })
  }

  if (canMarkPaid) {
    tabItems.push({
      key: 'payable',
      label: `待付款${payableClaims.length ? ` (${payableClaims.length})` : ''}`,
      children: (
        <Table
          rowKey="id"
          columns={payableColumns}
          dataSource={payableClaims}
          loading={payableLoading}
          pagination={{ pageSize: 10 }}
        />
      ),
    })
  }

  const canEditInvoices = detailClaim?.status === 'pending'
  const isOwnClaim = detailClaim?.user.id === user?.id

  return (
    <div>
      <Typography.Title level={4}>报销管理</Typography.Title>
      <Tabs items={tabItems} />

      <Modal
        title="申请报销"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createSaving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ category: 'traffic' }}>
          <Form.Item name="title" label="报销事项" rules={[{ required: true, message: '请输入报销事项' }]}>
            <Input placeholder="例如：客户拜访交通费" />
          </Form.Item>
          <Form.Item name="category" label="费用类别" rules={[{ required: true, message: '请选择费用类别' }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item name="amount" label="报销金额（元）" rules={[{ required: true, message: '请输入报销金额' }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expense_date" label="费用发生日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} placeholder="可选，补充说明费用情况" />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary">提交后可在「详情」中上传发票附件。</Typography.Text>
      </Modal>

      <Modal
        title={`报销详情：${detailClaim?.title ?? ''}`}
        open={!!detailClaim}
        onCancel={() => setDetailClaim(null)}
        footer={null}
        destroyOnHidden
        width={560}
      >
        {detailClaim && (
          <div>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <Space wrap>
                <Tag color={STATUS_MAP[detailClaim.status]?.color}>{STATUS_MAP[detailClaim.status]?.text}</Tag>
                <span>类别：{categoryLabel(detailClaim.category)}</span>
                <span>金额：¥{detailClaim.amount.toFixed(2)}</span>
                <span>发生日期：{detailClaim.expense_date}</span>
              </Space>
              {detailClaim.description && <Typography.Text type="secondary">说明：{detailClaim.description}</Typography.Text>}
              {detailClaim.approve_comment && (
                <Typography.Text type="secondary">审批意见：{detailClaim.approve_comment}</Typography.Text>
              )}
            </Space>

            <Typography.Title level={5}>发票附件</Typography.Title>
            {detailClaim.invoices.length === 0 ? (
              <Empty description="暂无发票" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={detailClaim.invoices}
                renderItem={(invoice) => (
                  <List.Item
                    actions={
                      canEditInvoices && isOwnClaim
                        ? [
                            <Popconfirm
                              key="delete"
                              title="确定删除该发票？"
                              onConfirm={() => handleRemoveInvoice(invoice.id)}
                            >
                              <Button type="link" danger icon={<DeleteOutlined />} size="small" />
                            </Popconfirm>,
                          ]
                        : undefined
                    }
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined style={{ fontSize: 20 }} />}
                      title={
                        <a href={invoice.file_url} target="_blank" rel="noreferrer">
                          {invoice.file_name}
                        </a>
                      }
                      description={
                        <span>
                          {invoice.invoice_no ? `发票号：${invoice.invoice_no}` : '未填写发票号'}
                          {invoice.amount != null ? ` · 金额：¥${invoice.amount.toFixed(2)}` : ''}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}

            {canEditInvoices && isOwnClaim && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Typography.Title level={5}>上传发票</Typography.Title>
                <Form form={invoiceForm} layout="vertical" onFinish={handleUploadInvoice}>
                  <Form.Item label="发票文件（图片或 PDF）" required>
                    <Upload
                      maxCount={1}
                      fileList={pendingFile ? [pendingFile] : []}
                      beforeUpload={(file) => {
                        setPendingFile({ uid: file.uid, name: file.name, originFileObj: file } as UploadFile)
                        return false
                      }}
                      onRemove={() => setPendingFile(null)}
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                    >
                      <Button icon={<UploadOutlined />}>选择文件</Button>
                    </Upload>
                  </Form.Item>
                  <Form.Item name="invoice_no" label="发票号（可选）">
                    <Input placeholder="发票号码" />
                  </Form.Item>
                  <Form.Item name="amount" label="发票金额（可选）">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={uploading}>
                    上传发票
                  </Button>
                </Form>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={decisionTarget?.action === 'approve' ? '批准报销申请' : '拒绝报销申请'}
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
