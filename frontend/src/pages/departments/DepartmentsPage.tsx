import { useEffect, useMemo, useState } from 'react'
import type { TreeDataNode } from 'antd'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { departmentApi, type DepartmentPayload } from '../../api/department'
import { userApi, type UserCreatePayload, type UserUpdatePayload } from '../../api/user'
import type { DepartmentOut, DepartmentTreeNode, UserOut } from '../../api/types'
import { ROLE_OPTIONS } from '../../constants/roles'
import { isAdmin, isHrOrAdmin, useAuthStore } from '../../store/auth'

interface DepartmentFormValues {
  name: string
  parent_id?: number
  leader_id?: number
  sort_order?: number
}

interface UserFormValues {
  username?: string
  password?: string
  email?: string
  display_name: string
  phone?: string
  gender?: string
  position?: string
  employee_no?: string
  hire_date?: string
  department_id?: number
  role_codes?: string[]
}

function buildTreeData(
  nodes: DepartmentTreeNode[],
  canManage: boolean,
  canDelete: boolean,
  onEdit: (dept: DepartmentTreeNode) => void,
  onDelete: (dept: DepartmentTreeNode) => void,
): TreeDataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: (
      <Space size={4}>
        <span>{node.name}</span>
        <Tag color="default">{node.member_count} 人</Tag>
        {node.leader_name && <Tag color="blue">负责人：{node.leader_name}</Tag>}
        {canManage && (
          <EditOutlined
            style={{ color: '#1677ff' }}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(node)
            }}
          />
        )}
        {canDelete && (
          <DeleteOutlined
            style={{ color: '#ff4d4f' }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node)
            }}
          />
        )}
      </Space>
    ),
    children: node.children.length ? buildTreeData(node.children, canManage, canDelete, onEdit, onDelete) : undefined,
  }))
}

export default function DepartmentsPage() {
  const currentUser = useAuthStore((state) => state.user)
  const canManageDept = isHrOrAdmin(currentUser)
  const canDeleteDept = isAdmin(currentUser)
  const canManageUser = isHrOrAdmin(currentUser)
  const canDeleteUser = isAdmin(currentUser)

  const [deptTree, setDeptTree] = useState<DepartmentTreeNode[]>([])
  const [deptFlat, setDeptFlat] = useState<DepartmentOut[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined)

  const [users, setUsers] = useState<UserOut[]>([])
  const [allUsers, setAllUsers] = useState<UserOut[]>([])
  const [keyword, setKeyword] = useState('')

  const [deptLoading, setDeptLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)

  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentTreeNode | null>(null)
  const [deptForm] = Form.useForm<DepartmentFormValues>()
  const [deptSaving, setDeptSaving] = useState(false)

  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserOut | null>(null)
  const [userForm] = Form.useForm<UserFormValues>()
  const [userSaving, setUserSaving] = useState(false)

  const loadDepartments = async () => {
    setDeptLoading(true)
    try {
      const [treeRes, flatRes] = await Promise.all([departmentApi.tree(), departmentApi.list()])
      setDeptTree(treeRes.data)
      setDeptFlat(flatRes.data)
    } finally {
      setDeptLoading(false)
    }
  }

  const loadUsers = async () => {
    setUserLoading(true)
    try {
      const res = await userApi.list({
        department_id: selectedDeptId,
        keyword: keyword || undefined,
      })
      setUsers(res.data)
    } finally {
      setUserLoading(false)
    }
  }

  const loadAllUsers = async () => {
    const res = await userApi.list()
    setAllUsers(res.data)
  }

  useEffect(() => {
    loadDepartments()
    loadAllUsers()
  }, [])

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeptId, keyword])

  const openCreateDept = (parentId?: number) => {
    setEditingDept(null)
    deptForm.resetFields()
    deptForm.setFieldsValue({ parent_id: parentId, sort_order: 0 })
    setDeptModalOpen(true)
  }

  const openEditDept = (dept: DepartmentTreeNode) => {
    setEditingDept(dept)
    deptForm.setFieldsValue({
      name: dept.name,
      parent_id: dept.parent_id ?? undefined,
      leader_id: dept.leader_id ?? undefined,
      sort_order: dept.sort_order,
    })
    setDeptModalOpen(true)
  }

  const handleDeleteDept = async (dept: DepartmentTreeNode) => {
    try {
      await departmentApi.remove(dept.id)
      message.success('部门已删除')
      loadDepartments()
    } catch {
      // 错误提示已由 axios 拦截器统一处理
    }
  }

  const handleDeptSubmit = async (values: DepartmentFormValues) => {
    setDeptSaving(true)
    try {
      const payload: DepartmentPayload = {
        name: values.name,
        parent_id: values.parent_id ?? null,
        leader_id: values.leader_id ?? null,
        sort_order: values.sort_order ?? 0,
      }
      if (editingDept) {
        await departmentApi.update(editingDept.id, payload)
        message.success('部门信息已更新')
      } else {
        await departmentApi.create(payload)
        message.success('部门创建成功')
      }
      setDeptModalOpen(false)
      loadDepartments()
    } finally {
      setDeptSaving(false)
    }
  }

  const treeData = useMemo(
    () => buildTreeData(deptTree, canManageDept, canDeleteDept, openEditDept, handleDeleteDept),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deptTree, canManageDept, canDeleteDept],
  )

  const openCreateUser = () => {
    setEditingUser(null)
    userForm.resetFields()
    userForm.setFieldsValue({ department_id: selectedDeptId, role_codes: ['employee'] })
    setUserModalOpen(true)
  }

  const openEditUser = (user: UserOut) => {
    setEditingUser(user)
    userForm.setFieldsValue({
      display_name: user.display_name,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      gender: user.gender ?? undefined,
      position: user.position ?? undefined,
      employee_no: user.employee_no ?? undefined,
      hire_date: user.hire_date ?? undefined,
      department_id: user.department?.id,
      role_codes: user.roles.map((role) => role.code),
    })
    setUserModalOpen(true)
  }

  const handleUserSubmit = async (values: UserFormValues) => {
    setUserSaving(true)
    try {
      if (editingUser) {
        const payload: UserUpdatePayload = {
          email: values.email ?? null,
          display_name: values.display_name,
          phone: values.phone ?? null,
          gender: values.gender ?? null,
          position: values.position ?? null,
          employee_no: values.employee_no ?? null,
          hire_date: values.hire_date ?? null,
          department_id: values.department_id ?? null,
          role_codes: values.role_codes,
        }
        await userApi.update(editingUser.id, payload)
        message.success('员工信息已更新')
      } else {
        const payload: UserCreatePayload = {
          username: values.username!,
          password: values.password!,
          email: values.email,
          display_name: values.display_name,
          phone: values.phone,
          gender: values.gender,
          position: values.position,
          employee_no: values.employee_no,
          hire_date: values.hire_date,
          department_id: values.department_id,
          role_codes: values.role_codes,
        }
        await userApi.create(payload)
        message.success('员工创建成功')
      }
      setUserModalOpen(false)
      loadUsers()
      loadAllUsers()
      loadDepartments()
    } finally {
      setUserSaving(false)
    }
  }

  const handleToggleActive = async (user: UserOut, active: boolean) => {
    await userApi.update(user.id, { is_active: active })
    message.success(active ? '员工已启用' : '员工已停用')
    loadUsers()
  }

  const handleDeleteUser = async (user: UserOut) => {
    await userApi.remove(user.id)
    message.success('员工已删除')
    loadUsers()
    loadAllUsers()
    loadDepartments()
  }

  const columns: ColumnsType<UserOut> = [
    { title: '姓名', dataIndex: 'display_name' },
    { title: '用户名', dataIndex: 'username' },
    { title: '工号', dataIndex: 'employee_no', render: (v) => v ?? '-' },
    { title: '部门', render: (_, record) => record.department?.name ?? '-' },
    { title: '职位', dataIndex: 'position', render: (v) => v ?? '-' },
    {
      title: '角色',
      render: (_, record) => (
        <Space size={4} wrap>
          {record.is_superuser && <Tag color="gold">超管</Tag>}
          {record.roles.map((role) => (
            <Tag key={role.code}>{role.name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      render: (_, record) =>
        canManageUser ? (
          <Switch
            checked={record.is_active}
            checkedChildren="启用"
            unCheckedChildren="停用"
            disabled={record.is_superuser}
            onChange={(checked) => handleToggleActive(record, checked)}
          />
        ) : (
          <Tag color={record.is_active ? 'green' : 'default'}>{record.is_active ? '启用' : '停用'}</Tag>
        ),
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          {canManageUser && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditUser(record)}>
              编辑
            </Button>
          )}
          {canDeleteUser && !record.is_superuser && (
            <Popconfirm title="确定删除该员工账号？" onConfirm={() => handleDeleteUser(record)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4}>组织架构</Typography.Title>
      <Row gutter={24}>
        <Col span={7}>
          <Card
            title={
              <Space>
                <TeamOutlined /> 部门
              </Space>
            }
            extra={
              canManageDept && (
                <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateDept()}>
                  新增
                </Button>
              )
            }
            loading={deptLoading}
          >
            <Button
              type={selectedDeptId === undefined ? 'primary' : 'text'}
              size="small"
              block
              style={{ marginBottom: 8, textAlign: 'left' }}
              onClick={() => setSelectedDeptId(undefined)}
            >
              全部部门
            </Button>
            <Tree
              treeData={treeData}
              defaultExpandAll
              selectedKeys={selectedDeptId !== undefined ? [selectedDeptId] : []}
              onSelect={(keys) => setSelectedDeptId(keys.length ? Number(keys[0]) : undefined)}
            />
          </Card>
        </Col>
        <Col span={17}>
          <Card
            title="员工列表"
            extra={
              <Space>
                <Input
                  placeholder="搜索姓名/用户名"
                  prefix={<SearchOutlined />}
                  allowClear
                  onChange={(e) => setKeyword(e.target.value)}
                  style={{ width: 200 }}
                />
                {canManageUser && (
                  <Button type="primary" icon={<UserAddOutlined />} onClick={openCreateUser}>
                    添加员工
                  </Button>
                )}
              </Space>
            }
          >
            <Table
              rowKey="id"
              loading={userLoading}
              columns={columns}
              dataSource={users}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingDept ? '编辑部门' : '新增部门'}
        open={deptModalOpen}
        onCancel={() => setDeptModalOpen(false)}
        onOk={() => deptForm.submit()}
        confirmLoading={deptSaving}
        destroyOnHidden
      >
        <Form form={deptForm} layout="vertical" onFinish={handleDeptSubmit}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parent_id" label="上级部门">
            <Select
              allowClear
              placeholder="不选则为顶级部门"
              options={deptFlat
                .filter((d) => !editingDept || d.id !== editingDept.id)
                .map((d) => ({ label: d.name, value: d.id }))}
            />
          </Form.Item>
          <Form.Item name="leader_id" label="部门负责人">
            <Select
              allowClear
              showSearch
              placeholder="选择负责人"
              optionFilterProp="label"
              options={allUsers.map((u) => ({ label: u.display_name, value: u.id }))}
            />
          </Form.Item>
          <Form.Item name="sort_order" label="排序值">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingUser ? '编辑员工' : '添加员工'}
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        onOk={() => userForm.submit()}
        confirmLoading={userSaving}
        destroyOnHidden
        width={560}
      >
        <Form form={userForm} layout="vertical" onFinish={handleUserSubmit}>
          {!editingUser && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="初始密码"
                  rules={[{ required: true, min: 6, message: '密码至少6位' }]}
                >
                  <Input.Password />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="display_name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="手机号">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="性别">
                <Select
                  allowClear
                  options={[
                    { label: '男', value: 'male' },
                    { label: '女', value: 'female' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="position" label="职位">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employee_no" label="工号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hire_date" label="入职日期">
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department_id" label="所属部门">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={deptFlat.map((d) => ({ label: d.name, value: d.id }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="role_codes" label="角色">
            <Select
              mode="multiple"
              options={ROLE_OPTIONS.map((r) => ({ label: r.name, value: r.code }))}
              placeholder="请选择角色"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
