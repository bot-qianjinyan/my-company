import type { ReactNode } from 'react'
import { Empty } from 'antd'
import './wiki-content.css'

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'hr' }

function parseTableRow(line: string): string[] {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() })
      index += 1
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: 'hr' })
      index += 1
      continue
    }

    if (line.trim().startsWith('```')) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }

    if (line.trim().startsWith('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = parseTableRow(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line)
      const items: string[] = []
      while (index < lines.length) {
        const item = ordered ? /^\d+\.\s+(.*)$/.exec(lines[index]) : /^[-*+]\s+(.*)$/.exec(lines[index])
        if (!item) break
        items.push(item[1])
        index += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    if (line.trim().startsWith('>')) {
      const quote: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push({ type: 'quote', text: quote.join('\n') })
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length && lines[index].trim() && !startsNewBlock(lines[index])) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    }
  }

  return blocks
}

function startsNewBlock(line: string): boolean {
  const trimmed = line.trim()
  return (
    /^(#{1,6})\s+/.test(trimmed) ||
    /^[-*+]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    trimmed.startsWith('|') ||
    trimmed.startsWith('>') ||
    trimmed.startsWith('```') ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)
  )
}

function isSafeUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:|\/)/i.test(url.trim())
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let tokenIndex = 0

  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${tokenIndex}`
    tokenIndex += 1
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link && isSafeUrl(link[2])) {
        const external = /^https?:\/\//i.test(link[2])
        nodes.push(
          <a key={key} href={link[2]} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
            {link[1]}
          </a>,
        )
      } else {
        nodes.push(link?.[1] ?? token)
      }
    }
    last = match.index + token.length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const HEADING_TAGS = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
} as const

interface WikiMarkdownProps {
  content: string
  title?: string
}

export default function WikiMarkdown({ content, title }: WikiMarkdownProps) {
  if (!content.trim()) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这篇文档还没有内容" />
  }

  let blocks = parseMarkdown(content)
  const first = blocks[0]
  if (title && first?.type === 'heading' && first.level === 1 && first.text === title) {
    blocks = blocks.slice(1)
  }

  return (
    <article className="wiki-content">
      {blocks.map((block, index) => {
        const key = `block-${index}`
        if (block.type === 'heading') {
          const Tag = HEADING_TAGS[block.level as keyof typeof HEADING_TAGS]
          return <Tag key={key}>{renderInline(block.text, key)}</Tag>
        }
        if (block.type === 'paragraph') {
          return <p key={key}>{renderInline(block.text, key)}</p>
        }
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ListTag>
          )
        }
        if (block.type === 'table') {
          return (
            <div key={key} className="wiki-table-wrap">
              <table>
                <thead>
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={`${key}-h-${headerIndex}`}>{renderInline(header, `${key}-h-${headerIndex}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${key}-r-${rowIndex}`}>
                      {block.headers.map((_, cellIndex) => (
                        <td key={`${key}-c-${rowIndex}-${cellIndex}`}>
                          {renderInline(row[cellIndex] ?? '', `${key}-c-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (block.type === 'quote') {
          return <blockquote key={key}>{renderInline(block.text, key)}</blockquote>
        }
        if (block.type === 'code') {
          return (
            <pre key={key}>
              <code>{block.text}</code>
            </pre>
          )
        }
        return <hr key={key} />
      })}
    </article>
  )
}
