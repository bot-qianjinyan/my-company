import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Slider, Typography } from 'antd'

/** 与后端 AVATAR_PX 一致：只上传这块正方形，不上传原图。 */
export const AVATAR_OUTPUT_PX = 256
const CROP = 240
const VIEW = 320

interface AvatarCropModalProps {
  file: File | null
  open: boolean
  onCancel: () => void
  onConfirm: (file: File) => void
}

export default function AvatarCropModal({ file, open, onCancel, onConfirm }: AvatarCropModalProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const scaleRef = useRef(1)
  const dragRef = useRef<{ pointerX: number; pointerY: number; originX: number; originY: number } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [minScale, setMinScale] = useState(1)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    if (!open || !file) return
    let cancelled = false
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      imageRef.current = image
      const cover = Math.max(CROP / image.width, CROP / image.height)
      setPreviewUrl(url)
      setNatural({ width: image.width, height: image.height })
      setMinScale(cover)
      setScale(cover)
      setOffset({
        x: (CROP - image.width * cover) / 2,
        y: (CROP - image.height * cover) / 2,
      })
      setReady(true)
    }
    image.onerror = () => {
      if (!cancelled) setReady(false)
    }
    image.src = url
    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
      imageRef.current = null
    }
  }, [open, file])

  const clampOffset = (nextScale: number, next: { x: number; y: number }) => {
    const width = natural.width * nextScale
    const height = natural.height * nextScale
    return {
      x: Math.min(0, Math.max(CROP - width, next.x)),
      y: Math.min(0, Math.max(CROP - height, next.y)),
    }
  }

  const handleZoom = (value: number) => {
    const prev = scaleRef.current
    const nextScale = minScale * value
    const ratio = prev > 0 ? nextScale / prev : 1
    const center = CROP / 2
    setOffset((current) =>
      clampOffset(nextScale, {
        x: center - (center - current.x) * ratio,
        y: center - (center - current.y) * ratio,
      }),
    )
    setScale(nextScale)
  }

  const confirm = () => {
    const image = imageRef.current
    if (!image) return
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_OUTPUT_PX
    canvas.height = AVATAR_OUTPUT_PX
    const context = canvas.getContext('2d')
    if (!context) return
    const size = CROP / scale
    context.drawImage(image, -offset.x / scale, -offset.y / scale, size, size, 0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  }

  const frame = (VIEW - CROP) / 2

  return (
    <Modal
      title="调整头像"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="ok" type="primary" disabled={!ready} onClick={confirm}>
          使用这个区域
        </Button>,
      ]}
    >
      <Typography.Paragraph type="secondary">
        拖动图片，把要保留的部分放进圆框。点击页面上的保存后，只会上传这块头像，不会保存整张原图。
      </Typography.Paragraph>
      <div
        style={{
          width: VIEW,
          height: VIEW,
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
          background: '#1f1f1f',
          borderRadius: 8,
          touchAction: 'none',
          cursor: 'grab',
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            originX: offset.x,
            originY: offset.y,
          }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag) return
          setOffset(
            clampOffset(scale, {
              x: drag.originX + event.clientX - drag.pointerX,
              y: drag.originY + event.clientY - drag.pointerY,
            }),
          )
        }}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onPointerCancel={() => {
          dragRef.current = null
        }}
      >
        {ready && previewUrl && (
          <img
            alt=""
            draggable={false}
            src={previewUrl}
            style={{
              position: 'absolute',
              width: natural.width * scale,
              height: natural.height * scale,
              left: frame + offset.x,
              top: frame + offset.y,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            left: frame,
            top: frame,
            width: CROP,
            height: CROP,
            borderRadius: '50%',
            boxShadow: '0 0 0 999px rgba(0, 0, 0, 0.55)',
            border: '2px solid #fff',
            pointerEvents: 'none',
          }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <Typography.Text type="secondary">缩放</Typography.Text>
        <Slider
          min={1}
          max={3}
          step={0.01}
          value={minScale > 0 ? scale / minScale : 1}
          onChange={handleZoom}
          tooltip={{ formatter: (value) => `${Number(value).toFixed(1)}x` }}
        />
      </div>
    </Modal>
  )
}
