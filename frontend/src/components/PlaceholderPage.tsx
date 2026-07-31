import { Empty, Typography } from 'antd'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div>
      <Typography.Title level={4}>{title}</Typography.Title>
      <Empty description={description ?? '该模块将在后续阶段开发'} style={{ marginTop: 80 }} />
    </div>
  )
}
