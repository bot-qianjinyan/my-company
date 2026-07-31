import { useEffect, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { BankOutlined, DeleteOutlined, EditOutlined, PlusOutlined, PushpinFilled } from '@ant-design/icons'
import { companyApi, type AnnouncementCreatePayload, type CompanyInfoUpdatePayload } from '../../api/company'
import type { AnnouncementOut, CompanyInfoOut } from '../../api/types'
import { isAdmin, isHrOrAdmin, useAuthStore } from '../../store/auth'

export default function CompanyPage() {
  const user = useAuthStore((state) => state.user)
  const canEditCompany = isAdmin(user)
  const canManageAnnouncement = isHrOrAdmin(user)

  const [company, setCompany] = useState<CompanyInfoOut | null>(null)
  const [announcements, setAnnouncements] = useState<AnnouncementOut[]>([])
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm<CompanyInfoUpdatePayload>()
  const [editSaving, setEditSaving] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm<AnnouncementCreatePayload>()
  const [createSaving, setCreateSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [companyRes, announcementRes] = await Promise.all([
        companyApi.getInfo(),
        companyApi.listAnnouncements(),
      ])
      setCompany(companyRes.data)
      setAnnouncements(announcementRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openEdit = () => {
    editForm.setFieldsValue({
      name: company?.name,
      slogan: company?.slogan ?? undefined,
      description: company?.description ?? undefined,
      logo_url: company?.logo_url ?? undefined,
      address: company?.address ?? undefined,
      website: company?.website ?? undefined,
      founded_date: company?.founded_date ?? undefined,
    })
    setEditOpen(true)
  }

  const handleEditSave = async (values: CompanyInfoUpdatePayload) => {
    setEditSaving(true)
    try {
      const res = await companyApi.updateInfo(values)
      setCompany(res.data)
      message.success('公司信息已更新')
      setEditOpen(false)
    } finally {
      setEditSaving(false)
    }
  }

  const handleCreateAnnouncement = async (values: AnnouncementCreatePayload) => {
    setCreateSaving(true)
    try {
      await companyApi.createAnnouncement({ ...values, pinned: values.pinned ?? false })
      message.success('公告已发布')
      setCreateOpen(false)
      createForm.resetFields()
      loadData()
    } finally {
      setCreateSaving(false)
    }
  }

  const handleDeleteAnnouncement = async (id: number) => {
    await companyApi.deleteAnnouncement(id)
    message.success('公告已删除')
    loadData()
  }

  return (
    <div>
      <Typography.Title level={4}>公司信息</Typography.Title>
      <Card
        loading={loading}
        title={
          <Space>
            <Avatar shape="square" size={40} src={company?.logo_url || undefined} icon={<BankOutlined />} />
            {company?.name ?? '未设置公司信息'}
          </Space>
        }
        extra={
          canEditCompany ? (
            <Button icon={<EditOutlined />} onClick={openEdit}>
              编辑
            </Button>
          ) : undefined
        }
        style={{ marginBottom: 24 }}
      >
        {company ? (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Slogan" span={2}>
              {company.slogan ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="简介" span={2}>
              {company.description ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="地址">{company.address ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="官网">{company.website ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="成立日期">{company.founded_date ?? '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="暂无公司信息" />
        )}
      </Card>

      <Card
        title="公告栏"
        extra={
          canManageAnnouncement ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              发布公告
            </Button>
          ) : undefined
        }
      >
        <List
          loading={loading}
          dataSource={announcements}
          locale={{ emptyText: '暂无公告' }}
          renderItem={(item) => (
            <List.Item
              actions={
                canManageAnnouncement
                  ? [
                      <Popconfirm
                        key="delete"
                        title="确定删除该公告？"
                        onConfirm={() => handleDeleteAnnouncement(item.id)}
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
                  : undefined
              }
            >
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
                  <>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{item.content}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.created_by_name ?? '系统'} · {new Date(item.created_at).toLocaleString()}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="编辑公司信息"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={editSaving}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSave}>
          <Form.Item name="name" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slogan" label="Slogan">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="logo_url" label="Logo 地址">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Form.Item name="website" label="官网">
            <Input />
          </Form.Item>
          <Form.Item name="founded_date" label="成立日期">
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发布公告"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createSaving}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateAnnouncement}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="pinned" valuePropName="checked">
            <Checkbox>置顶</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
