import { useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { projectApi, type IssueCreatePayload, type ProjectCreatePayload } from '../../api/project'
import { userApi } from '../../api/user'
import type { IssueOut, ProjectOut, UserOut } from '../../api/types'
import { isAdmin, useAuthStore } from '../../store/auth'

const STATUS_COLUMNS: { key: string; title: string }[] = [
  { key: 'todo', title: '待办' },
  { key: 'in_progress', title: '进行中' },
  { key: 'done', title: '已完成' },
]

const ISSUE_TYPE_OPTIONS = [
  { value: 'task', label: '任务' },
  { value: 'bug', label: '缺陷' },
  { value: 'story', label: '需求' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
]

const PRIORITY_COLOR: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
}

function typeLabel(value: string): string {
  return ISSUE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value
}

interface IssueFormValues {
  title: string
  description?: string
  issue_type: string
  priority: string
  assignee_id?: number
  due_date?: dayjs.Dayjs
}

export default function ProjectsPage() {
  const user = useAuthStore((state) => state.user)
  const canCreateProject = true

  const [projects, setProjects] = useState<ProjectOut[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [users, setUsers] = useState<UserOut[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectOut | null>(null)

  const [issues, setIssues] = useState<IssueOut[]>([])
  const [issuesLoading, setIssuesLoading] = useState(false)

  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectOut | null>(null)
  const [projectForm] = Form.useForm<ProjectCreatePayload>()
  const [projectSaving, setProjectSaving] = useState(false)

  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [issueForm] = Form.useForm<IssueFormValues>()
  const [issueSaving, setIssueSaving] = useState(false)
  const [editingIssue, setEditingIssue] = useState<IssueOut | null>(null)

  const loadProjects = async () => {
    setProjectsLoading(true)
    try {
      const res = await projectApi.list()
      setProjects(res.data)
    } finally {
      setProjectsLoading(false)
    }
  }

  const loadUsers = async () => {
    const res = await userApi.list()
    setUsers(res.data)
  }

  useEffect(() => {
    loadProjects()
    loadUsers()
  }, [])

  const loadIssues = async (project: ProjectOut) => {
    setIssuesLoading(true)
    try {
      const res = await projectApi.listIssues(project.id)
      setIssues(res.data)
    } finally {
      setIssuesLoading(false)
    }
  }

  const openProject = (project: ProjectOut) => {
    setSelectedProject(project)
    loadIssues(project)
  }

  const canManageProject = (project: ProjectOut) => isAdmin(user) || project.owner?.id === user?.id

  const userOptions = useMemo(
    () =>
      users
        .filter((item) => item.is_active)
        .map((item) => ({ value: item.id, label: item.display_name })),
    [users],
  )

  const assigneeOptions = useMemo(() => {
    const members = selectedProject?.members ?? []
    const options =
      members.length > 0
        ? members.map((item) => ({ value: item.id, label: item.display_name }))
        : userOptions
    if (editingIssue?.assignee && !options.some((item) => item.value === editingIssue.assignee?.id)) {
      return [...options, { value: editingIssue.assignee.id, label: editingIssue.assignee.display_name }]
    }
    return options
  }, [editingIssue, selectedProject, userOptions])

  const openCreateProject = () => {
    setEditingProject(null)
    projectForm.resetFields()
    projectForm.setFieldsValue({ member_ids: user?.id ? [user.id] : [] })
    setProjectModalOpen(true)
  }

  const openEditProject = (project: ProjectOut) => {
    setEditingProject(project)
    projectForm.setFieldsValue({
      key: project.key,
      name: project.name,
      description: project.description ?? undefined,
      member_ids: (project.members ?? []).map((member) => member.id),
    })
    setProjectModalOpen(true)
  }

  const handleSaveProject = async (values: ProjectCreatePayload) => {
    setProjectSaving(true)
    try {
      const ownerId = editingProject?.owner?.id ?? user?.id
      const memberIds = Array.from(new Set([...(values.member_ids ?? []), ...(ownerId ? [ownerId] : [])]))
      if (editingProject) {
        const res = await projectApi.update(editingProject.id, {
          name: values.name,
          description: values.description,
          member_ids: memberIds,
        })
        message.success('项目已更新')
        if (selectedProject?.id === res.data.id) {
          setSelectedProject(res.data)
        }
      } else {
        await projectApi.create({ ...values, member_ids: memberIds })
        message.success('项目创建成功')
      }
      setProjectModalOpen(false)
      projectForm.resetFields()
      setEditingProject(null)
      loadProjects()
    } finally {
      setProjectSaving(false)
    }
  }

  const handleDeleteProject = async (project: ProjectOut) => {
    await projectApi.remove(project.id)
    message.success('项目已删除')
    loadProjects()
    if (selectedProject?.id === project.id) {
      setSelectedProject(null)
    }
  }

  const openCreateIssue = () => {
    setEditingIssue(null)
    issueForm.resetFields()
    issueForm.setFieldsValue({ issue_type: 'task', priority: 'medium' })
    setIssueModalOpen(true)
  }

  const openEditIssue = (issue: IssueOut) => {
    setEditingIssue(issue)
    issueForm.setFieldsValue({
      title: issue.title,
      description: issue.description ?? undefined,
      issue_type: issue.issue_type,
      priority: issue.priority,
      assignee_id: issue.assignee?.id,
      due_date: issue.due_date ? dayjs(issue.due_date) : undefined,
    })
    setIssueModalOpen(true)
  }

  const handleSaveIssue = async (values: IssueFormValues) => {
    if (!selectedProject) return
    setIssueSaving(true)
    try {
      const payload: IssueCreatePayload = {
        title: values.title,
        description: values.description,
        issue_type: values.issue_type,
        priority: values.priority,
        assignee_id: values.assignee_id ?? null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      }
      if (editingIssue) {
        await projectApi.updateIssue(editingIssue.id, payload)
        message.success('工单已更新')
      } else {
        await projectApi.createIssue(selectedProject.id, payload)
        message.success('工单创建成功')
      }
      setIssueModalOpen(false)
      loadIssues(selectedProject)
      loadProjects()
    } finally {
      setIssueSaving(false)
    }
  }

  const handleMoveIssue = async (issue: IssueOut, status: string) => {
    await projectApi.updateIssue(issue.id, { status })
    message.success('状态已更新')
    if (selectedProject) loadIssues(selectedProject)
  }

  const handleDeleteIssue = async (issue: IssueOut) => {
    await projectApi.removeIssue(issue.id)
    message.success('工单已删除')
    if (selectedProject) {
      loadIssues(selectedProject)
      loadProjects()
    }
  }

  const issuesByStatus = useMemo(() => {
    const grouped: Record<string, IssueOut[]> = { todo: [], in_progress: [], done: [] }
    issues.forEach((issue) => {
      grouped[issue.status]?.push(issue)
    })
    return grouped
  }, [issues])

  return (
    <div>
      {selectedProject ? (
      <div>
        <Space style={{ marginBottom: 16 }} align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedProject(null)}>
            返回
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {selectedProject.name} ({selectedProject.key})
          </Typography.Title>
          <Avatar.Group max={{ count: 6 }}>
            {(selectedProject.members ?? []).map((member) => (
              <Tooltip key={member.id} title={member.display_name}>
                <Avatar src={member.avatar_url ?? undefined} icon={<UserOutlined />} />
              </Tooltip>
            ))}
          </Avatar.Group>
          {canManageProject(selectedProject) && (
            <Button icon={<EditOutlined />} onClick={() => openEditProject(selectedProject)}>
              项目成员
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateIssue}>
            新建工单
          </Button>
        </Space>
        <Row gutter={16}>
          {STATUS_COLUMNS.map((column) => (
            <Col span={8} key={column.key}>
              <Card
                title={`${column.title} (${issuesByStatus[column.key]?.length ?? 0})`}
                loading={issuesLoading}
                styles={{ body: { minHeight: 400, background: '#fafafa' } }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {(issuesByStatus[column.key] ?? []).map((issue) => (
                    <Card
                      key={issue.id}
                      size="small"
                      hoverable
                      onClick={() => openEditIssue(issue)}
                      extra={
                        <Dropdown
                          menu={{
                            items: [
                              ...STATUS_COLUMNS.filter((s) => s.key !== issue.status).map((s) => ({
                                key: s.key,
                                label: `移动到 ${s.title}`,
                                onClick: () => handleMoveIssue(issue, s.key),
                              })),
                              { type: 'divider' as const },
                              {
                                key: 'delete',
                                danger: true,
                                label: (
                                  <Popconfirm
                                    title="确定删除该工单？"
                                    onConfirm={(e) => {
                                      e?.stopPropagation()
                                      handleDeleteIssue(issue)
                                    }}
                                  >
                                    <span onClick={(e) => e.stopPropagation()}>删除</span>
                                  </Popconfirm>
                                ),
                              },
                            ],
                          }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      }
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Typography.Text strong>{issue.title}</Typography.Text>
                        <Space size={4}>
                          <Tag>{typeLabel(issue.issue_type)}</Tag>
                          <Tag color={PRIORITY_COLOR[issue.priority]}>
                            {PRIORITY_OPTIONS.find((p) => p.value === issue.priority)?.label}
                          </Tag>
                        </Space>
                        <Space size={4} style={{ justifyContent: 'space-between', width: '100%' }}>
                          {issue.due_date && (
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {issue.due_date}
                            </Typography.Text>
                          )}
                          <Tooltip title={issue.assignee?.display_name ?? '未分配'}>
                            <Avatar
                              size="small"
                              src={issue.assignee?.avatar_url ?? undefined}
                              icon={<UserOutlined />}
                            />
                          </Tooltip>
                        </Space>
                      </Space>
                    </Card>
                  ))}
                  {(issuesByStatus[column.key] ?? []).length === 0 && (
                    <Empty description="暂无工单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Modal
          title={editingIssue ? '编辑工单' : '新建工单'}
          open={issueModalOpen}
          onCancel={() => setIssueModalOpen(false)}
          onOk={() => issueForm.submit()}
          confirmLoading={issueSaving}
          destroyOnHidden
        >
          <Form form={issueForm} layout="vertical" onFinish={handleSaveIssue}>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Space style={{ width: '100%' }} size="middle">
              <Form.Item name="issue_type" label="类型" style={{ width: 140 }}>
                <Select options={ISSUE_TYPE_OPTIONS} />
              </Form.Item>
              <Form.Item name="priority" label="优先级" style={{ width: 140 }}>
                <Select options={PRIORITY_OPTIONS} />
              </Form.Item>
            </Space>
            <Form.Item name="assignee_id" label="指派给">
              <Select
                allowClear
                showSearch
                placeholder="选择项目成员"
                optionFilterProp="label"
                options={assigneeOptions}
              />
            </Form.Item>
            <Form.Item name="due_date" label="截止日期">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
      ) : (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Jira看板
        </Typography.Title>
        {canCreateProject && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProject}>
            创建项目
          </Button>
        )}
      </Space>
      <Row gutter={[16, 16]}>
        {projects.map((project) => (
          <Col span={8} key={project.id}>
            <Card
              hoverable
              loading={projectsLoading}
              onClick={() => openProject(project)}
              title={
                <Space>
                  <ProjectOutlined />
                  {project.name}
                  <Tag>{project.key}</Tag>
                </Space>
              }
              extra={
                canManageProject(project) ? (
                  <Space size={0} onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEditProject(project)}
                    />
                    <Popconfirm
                      title="确定删除该项目？"
                      onConfirm={() => handleDeleteProject(project)}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ) : undefined
              }
            >
              <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                {project.description || '暂无描述'}
              </Typography.Paragraph>
              <Space direction="vertical" size={8}>
                <Avatar.Group max={{ count: 5 }}>
                  {(project.members ?? []).map((member) => (
                    <Tooltip key={member.id} title={member.display_name}>
                      <Avatar size="small" src={member.avatar_url ?? undefined} icon={<UserOutlined />} />
                    </Tooltip>
                  ))}
                </Avatar.Group>
                <Space>
                  <Tag>{project.member_count} 位成员</Tag>
                  <Tag>{project.issue_count} 个工单</Tag>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
        {!projectsLoading && projects.length === 0 && (
          <Col span={24}>
            <Empty description="暂无项目" />
          </Col>
        )}
      </Row>
    </div>
      )}

      <Modal
        title={editingProject ? '编辑项目成员' : '创建项目'}
        open={projectModalOpen}
        onCancel={() => {
          setProjectModalOpen(false)
          setEditingProject(null)
        }}
        onOk={() => projectForm.submit()}
        confirmLoading={projectSaving}
        destroyOnHidden
      >
        <Form form={projectForm} layout="vertical" onFinish={handleSaveProject}>
          {!editingProject && (
            <Form.Item
              name="key"
              label="项目编号"
              rules={[{ required: true, message: '请输入项目编号，如 OPS' }]}
            >
              <Input placeholder="例如 OPS" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          )}
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="member_ids"
            label="项目成员"
            rules={[{ required: true, message: '请选择项目成员' }]}
            extra="项目负责人会始终保留在成员中。工单只能指派给这些成员。"
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="选择项目成员"
              optionFilterProp="label"
              options={userOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
