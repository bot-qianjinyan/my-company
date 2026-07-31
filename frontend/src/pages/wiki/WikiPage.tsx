import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tree,
  Typography,
  message,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import { BookOutlined, DeleteOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import { wikiApi, type WikiPageCreatePayload, type WikiSpaceCreatePayload } from '../../api/wiki'
import type { WikiPageOut, WikiSpaceOut } from '../../api/types'
import { isAdmin, useAuthStore } from '../../store/auth'

interface PageFormValues {
  title: string
  content?: string
  as_root?: boolean
}

function buildTree(pages: WikiPageOut[]): DataNode[] {
  const nodeMap = new Map<number, DataNode & { parentId: number | null }>()
  pages.forEach((page) => {
    nodeMap.set(page.id, {
      key: page.id,
      title: page.title,
      icon: <FileTextOutlined />,
      parentId: page.parent_id ?? null,
      children: [],
    })
  })
  const roots: DataNode[] = []
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!
      ;(parent.children as DataNode[]).push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export default function WikiPage() {
  const user = useAuthStore((state) => state.user)

  const [spaces, setSpaces] = useState<WikiSpaceOut[]>([])
  const [spacesLoading, setSpacesLoading] = useState(true)
  const [selectedSpace, setSelectedSpace] = useState<WikiSpaceOut | null>(null)

  const [pages, setPages] = useState<WikiPageOut[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [selectedPage, setSelectedPage] = useState<WikiPageOut | null>(null)

  const [content, setContent] = useState('')
  const [contentDirty, setContentDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const [spaceModalOpen, setSpaceModalOpen] = useState(false)
  const [spaceForm] = Form.useForm<WikiSpaceCreatePayload>()
  const [spaceSaving, setSpaceSaving] = useState(false)

  const [pageModalOpen, setPageModalOpen] = useState(false)
  const [pageForm] = Form.useForm<PageFormValues>()
  const [pageSaving, setPageSaving] = useState(false)

  const canManageSpace = (space: WikiSpaceOut | null) => !!space && (isAdmin(user) || space.owner?.id === user?.id)

  const loadSpaces = async () => {
    setSpacesLoading(true)
    try {
      const res = await wikiApi.listSpaces()
      setSpaces(res.data)
      if (!selectedSpace && res.data.length > 0) {
        setSelectedSpace(res.data[0])
      }
    } finally {
      setSpacesLoading(false)
    }
  }

  useEffect(() => {
    loadSpaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPages = async (space: WikiSpaceOut) => {
    setPagesLoading(true)
    try {
      const res = await wikiApi.listPages(space.id)
      setPages(res.data)
    } finally {
      setPagesLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSpace) {
      loadPages(selectedSpace)
      setSelectedPage(null)
      setContent('')
    }
  }, [selectedSpace])

  const treeData = useMemo(() => buildTree(pages), [pages])

  const handleSelectPage = (id: number) => {
    const page = pages.find((p) => p.id === id)
    if (page) {
      setSelectedPage(page)
      setContent(page.content)
      setContentDirty(false)
    }
  }

  const handleCreateSpace = async (values: WikiSpaceCreatePayload) => {
    setSpaceSaving(true)
    try {
      const res = await wikiApi.createSpace(values)
      message.success('知识库空间创建成功')
      setSpaceModalOpen(false)
      spaceForm.resetFields()
      await loadSpaces()
      setSelectedSpace(res.data)
    } finally {
      setSpaceSaving(false)
    }
  }

  const handleDeleteSpace = async (space: WikiSpaceOut) => {
    await wikiApi.removeSpace(space.id)
    message.success('空间已删除')
    if (selectedSpace?.id === space.id) {
      setSelectedSpace(null)
    }
    loadSpaces()
  }

  const openCreatePage = () => {
    pageForm.resetFields()
    pageForm.setFieldsValue({ as_root: !selectedPage })
    setPageModalOpen(true)
  }

  const handleCreatePage = async (values: PageFormValues) => {
    if (!selectedSpace) return
    setPageSaving(true)
    try {
      const payload: WikiPageCreatePayload = {
        title: values.title,
        content: values.content ?? '',
        parent_id: values.as_root ? null : selectedPage?.id ?? null,
      }
      const res = await wikiApi.createPage(selectedSpace.id, payload)
      message.success('文档创建成功')
      setPageModalOpen(false)
      await loadPages(selectedSpace)
      setSelectedPage(res.data)
      setContent(res.data.content)
    } finally {
      setPageSaving(false)
    }
  }

  const handleSaveContent = async () => {
    if (!selectedPage) return
    setSaving(true)
    try {
      const res = await wikiApi.updatePage(selectedPage.id, { content })
      message.success('文档已保存')
      setSelectedPage(res.data)
      setContentDirty(false)
      if (selectedSpace) loadPages(selectedSpace)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePage = async (page: WikiPageOut) => {
    await wikiApi.removePage(page.id)
    message.success('文档已删除')
    if (selectedSpace) loadPages(selectedSpace)
    if (selectedPage?.id === page.id) {
      setSelectedPage(null)
      setContent('')
    }
  }

  return (
    <div>
      <Typography.Title level={4}>知识库</Typography.Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card
            size="small"
            title="空间"
            extra={
              <Button type="text" icon={<PlusOutlined />} onClick={() => setSpaceModalOpen(true)} />
            }
            loading={spacesLoading}
            style={{ marginBottom: 16 }}
          >
            <List
              size="small"
              dataSource={spaces}
              locale={{ emptyText: '暂无空间' }}
              renderItem={(space) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    background: selectedSpace?.id === space.id ? '#e6f4ff' : undefined,
                    paddingLeft: 8,
                    paddingRight: 8,
                  }}
                  onClick={() => setSelectedSpace(space)}
                  actions={
                    canManageSpace(space)
                      ? [
                          <Popconfirm
                            key="delete"
                            title="确定删除该空间？"
                            onConfirm={(e) => {
                              e?.stopPropagation()
                              handleDeleteSpace(space)
                            }}
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>,
                        ]
                      : undefined
                  }
                >
                  <Space>
                    <BookOutlined />
                    {space.name}
                  </Space>
                </List.Item>
              )}
            />
          </Card>

          {selectedSpace && (
            <Card
              size="small"
              title="文档目录"
              extra={<Button type="text" icon={<PlusOutlined />} onClick={openCreatePage} />}
              loading={pagesLoading}
            >
              {treeData.length > 0 ? (
                <Tree
                  treeData={treeData}
                  selectedKeys={selectedPage ? [selectedPage.id] : []}
                  onSelect={(keys) => keys.length > 0 && handleSelectPage(Number(keys[0]))}
                  defaultExpandAll
                />
              ) : (
                <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          )}
        </Col>

        <Col span={18}>
          {selectedPage ? (
            <Card
              title={selectedPage.title}
              extra={
                <Space>
                  <Popconfirm title="确定删除该文档？" onConfirm={() => handleDeletePage(selectedPage)}>
                    <Button danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                  <Button type="primary" disabled={!contentDirty} loading={saving} onClick={handleSaveContent}>
                    保存
                  </Button>
                </Space>
              }
            >
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                创建人：{selectedPage.creator?.display_name ?? '-'} · 最后更新：
                {selectedPage.updated_by?.display_name ?? '-'} {new Date(selectedPage.updated_at).toLocaleString()}
              </Typography.Text>
              <Input.TextArea
                style={{ marginTop: 16, fontFamily: 'monospace' }}
                rows={20}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setContentDirty(true)
                }}
                placeholder="支持 Markdown 格式书写文档内容"
              />
            </Card>
          ) : (
            <Card>
              <Empty description={selectedSpace ? '请选择或创建一篇文档' : '请选择一个知识库空间'} />
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="创建知识库空间"
        open={spaceModalOpen}
        onCancel={() => setSpaceModalOpen(false)}
        onOk={() => spaceForm.submit()}
        confirmLoading={spaceSaving}
        destroyOnHidden
      >
        <Form form={spaceForm} layout="vertical" onFinish={handleCreateSpace}>
          <Form.Item name="key" label="空间编号" rules={[{ required: true, message: '请输入空间编号，如 DEV' }]}>
            <Input placeholder="例如 DEV" />
          </Form.Item>
          <Form.Item name="name" label="空间名称" rules={[{ required: true, message: '请输入空间名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建文档"
        open={pageModalOpen}
        onCancel={() => setPageModalOpen(false)}
        onOk={() => pageForm.submit()}
        confirmLoading={pageSaving}
        destroyOnHidden
      >
        <Form form={pageForm} layout="vertical" onFinish={handleCreatePage}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入文档标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={4} />
          </Form.Item>
          {selectedPage && (
            <Form.Item name="as_root" valuePropName="checked">
              <Checkbox>作为根文档（不设为「{selectedPage.title}」的子文档）</Checkbox>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
