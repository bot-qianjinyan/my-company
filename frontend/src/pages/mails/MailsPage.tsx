import { useEffect, useState } from 'react'
import { Button, Form, Input, List, Modal, Popconfirm, Select, Space, Tabs, Tag, Typography, message } from 'antd'
import { DeleteOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons'
import { mailApi, type MailCreatePayload } from '../../api/mail'
import { userApi } from '../../api/user'
import type { InboxMailOut, SentMailOut, UserOut } from '../../api/types'
import { useAuthStore } from '../../store/auth'

export default function MailsPage() {
  const currentUser = useAuthStore((state) => state.user)

  const [inbox, setInbox] = useState<InboxMailOut[]>([])
  const [inboxLoading, setInboxLoading] = useState(true)
  const [sent, setSent] = useState<SentMailOut[]>([])
  const [sentLoading, setSentLoading] = useState(true)
  const [users, setUsers] = useState<UserOut[]>([])

  const [detail, setDetail] = useState<InboxMailOut | SentMailOut | null>(null)

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeForm] = Form.useForm<MailCreatePayload>()
  const [sending, setSending] = useState(false)

  const loadInbox = async () => {
    setInboxLoading(true)
    try {
      const res = await mailApi.inbox()
      setInbox(res.data)
    } finally {
      setInboxLoading(false)
    }
  }

  const loadSent = async () => {
    setSentLoading(true)
    try {
      const res = await mailApi.sent()
      setSent(res.data)
    } finally {
      setSentLoading(false)
    }
  }

  useEffect(() => {
    loadInbox()
    loadSent()
    userApi.list().then((res) => setUsers(res.data.filter((u) => u.id !== currentUser?.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openDetail = async (mail: InboxMailOut | SentMailOut) => {
    setDetail(mail)
    await mailApi.get(mail.id)
    loadInbox()
  }

  const handleSend = async (values: MailCreatePayload) => {
    setSending(true)
    try {
      await mailApi.send(values)
      message.success('邮件已发送')
      setComposeOpen(false)
      composeForm.resetFields()
      loadSent()
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: number) => {
    await mailApi.remove(id)
    message.success('邮件已删除')
    loadInbox()
    loadSent()
  }

  const tabItems = [
    {
      key: 'inbox',
      label: `收件箱${inbox.filter((m) => !m.is_read).length ? ` (${inbox.filter((m) => !m.is_read).length})` : ''}`,
      children: (
        <List
          loading={inboxLoading}
          dataSource={inbox}
          locale={{ emptyText: '暂无邮件' }}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => openDetail(item)}
              actions={[
                <Popconfirm
                  key="delete"
                  title="确定删除该邮件？"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    handleDelete(item.id)
                  }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<MailOutlined style={{ fontSize: 18 }} />}
                title={
                  <Space>
                    {!item.is_read && <Tag color="blue">未读</Tag>}
                    <span style={{ fontWeight: item.is_read ? 'normal' : 'bold' }}>{item.subject}</span>
                  </Space>
                }
                description={`来自 ${item.sender.display_name} · ${new Date(item.created_at).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'sent',
      label: '已发送',
      children: (
        <List
          loading={sentLoading}
          dataSource={sent}
          locale={{ emptyText: '暂无已发送邮件' }}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => openDetail(item)}
              actions={[
                <Popconfirm
                  key="delete"
                  title="确定删除该邮件？"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    handleDelete(item.id)
                  }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<MailOutlined style={{ fontSize: 18 }} />}
                title={item.subject}
                description={`发给 ${item.recipients.map((r) => r.display_name).join('、')} · ${new Date(
                  item.created_at,
                ).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          站内邮件
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setComposeOpen(true)}>
          写邮件
        </Button>
      </Space>
      <Tabs items={tabItems} />

      <Modal title="写邮件" open={composeOpen} onCancel={() => setComposeOpen(false)} onOk={() => composeForm.submit()} confirmLoading={sending} destroyOnHidden>
        <Form form={composeForm} layout="vertical" onFinish={handleSend}>
          <Form.Item name="recipient_ids" label="收件人" rules={[{ required: true, message: '请选择至少一位收件人' }]}>
            <Select
              mode="multiple"
              showSearch
              placeholder="选择收件人"
              optionFilterProp="label"
              options={users.map((u) => ({ value: u.id, label: u.display_name }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="主题" rules={[{ required: true, message: '请输入主题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={detail?.subject} open={!!detail} onCancel={() => setDetail(null)} footer={null}>
        {detail && (
          <>
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                发件人：{detail.sender.display_name} · {new Date(detail.created_at).toLocaleString()}
              </Typography.Text>
              {'recipients' in detail && (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    收件人：{detail.recipients.map((r) => r.display_name).join('、')}
                  </Typography.Text>
                </div>
              )}
            </div>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</Typography.Paragraph>
          </>
        )}
      </Modal>
    </div>
  )
}
