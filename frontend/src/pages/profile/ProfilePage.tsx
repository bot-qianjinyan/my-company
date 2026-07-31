import { useEffect, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { authApi } from '../../api/auth'
import { userApi, type ProfileUpdatePayload } from '../../api/user'
import { useAuthStore } from '../../store/auth'

const GENDER_LABEL: Record<string, string> = { male: '男', female: '女' }

interface ChangePasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [form] = Form.useForm<ProfileUpdatePayload>()
  const [saving, setSaving] = useState(false)

  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwdForm] = Form.useForm<ChangePasswordForm>()
  const [pwdSaving, setPwdSaving] = useState(false)

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        display_name: user.display_name,
        phone: user.phone ?? undefined,
        avatar_url: user.avatar_url ?? undefined,
        gender: user.gender ?? undefined,
      })
    }
  }, [user, form])

  if (!user) return null

  const handleSave = async (values: ProfileUpdatePayload) => {
    setSaving(true)
    try {
      const res = await userApi.updateMyProfile(values)
      setUser(res.data)
      message.success('个人信息已更新')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (values: ChangePasswordForm) => {
    setPwdSaving(true)
    try {
      await authApi.changePassword(values.oldPassword, values.newPassword)
      message.success('密码修改成功')
      setPwdOpen(false)
      pwdForm.resetFields()
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div>
      <Typography.Title level={4}>我的信息</Typography.Title>
      <Row gutter={24}>
        <Col span={8}>
          <Card>
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
              <Avatar size={96} src={user.avatar_url ?? undefined} icon={<UserOutlined />} />
              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {user.display_name}
              </Typography.Title>
              <Space wrap>
                {user.is_superuser && <Tag color="gold">超级管理员</Tag>}
                {user.roles.map((role) => (
                  <Tag color="blue" key={role.code}>
                    {role.name}
                  </Tag>
                ))}
              </Space>
            </Space>
            <Divider />
            <Descriptions column={1} size="small">
              <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{user.email ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="部门">{user.department?.name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="职位">{user.position ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="工号">{user.employee_no ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="入职日期">{user.hire_date ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="性别">
                {user.gender ? (GENDER_LABEL[user.gender] ?? user.gender) : '-'}
              </Descriptions.Item>
            </Descriptions>
            <Button block style={{ marginTop: 16 }} icon={<LockOutlined />} onClick={() => setPwdOpen(true)}>
              修改密码
            </Button>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="编辑个人资料">
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item name="display_name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="姓名" />
              </Form.Item>
              <Form.Item name="phone" label="手机号">
                <Input placeholder="手机号" />
              </Form.Item>
              <Form.Item name="gender" label="性别">
                <Radio.Group>
                  <Radio value="male">男</Radio>
                  <Radio value="female">女</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="avatar_url" label="头像地址">
                <Input placeholder="头像图片 URL" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={saving}>
                  保存
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title="修改密码"
        open={pwdOpen}
        onCancel={() => setPwdOpen(false)}
        onOk={() => pwdForm.submit()}
        confirmLoading={pwdSaving}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, min: 6, message: '新密码至少6位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
