import io
import time
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, ImageOps

from app.core.exceptions import AppException

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads"
INVOICE_SUBDIR = "invoices"
AVATAR_SUBDIR = "avatars"
ALLOWED_INVOICE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_INVOICE_SIZE_BYTES = 10 * 1024 * 1024
MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024
# 页面头像显示为 96px，按约 2.5 倍保存，保证清晰，同时不再保留原图。
AVATAR_PX = 256


async def save_invoice_file(file: UploadFile) -> tuple[str, str]:
    """保存发票附件到本地磁盘，返回 (存储相对路径, 原始文件名)"""

    original_name = file.filename or "invoice"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_INVOICE_EXTENSIONS:
        raise AppException("仅支持上传图片（jpg/png/webp）或 PDF 格式的发票文件")

    content = await file.read()
    if len(content) > MAX_INVOICE_SIZE_BYTES:
        raise AppException("发票文件大小不能超过 10MB")
    if not content:
        raise AppException("上传的文件内容为空")

    target_dir = UPLOAD_ROOT / INVOICE_SUBDIR
    target_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}{ext}"
    target_path = target_dir / stored_name
    target_path.write_bytes(content)

    relative_path = f"{INVOICE_SUBDIR}/{stored_name}"
    return relative_path, original_name


def delete_invoice_file(relative_path: str) -> None:
    target_path = UPLOAD_ROOT / relative_path
    if target_path.exists():
        target_path.unlink()


def invoice_file_url(relative_path: str) -> str:
    return f"/uploads/{relative_path}"


def render_avatar_bytes(content: bytes) -> bytes:
    """把上传图裁成正方形并缩放到头像尺寸，返回要落盘的 JPEG。"""

    try:
        image = Image.open(io.BytesIO(content))
        transposed = ImageOps.exif_transpose(image)
        if transposed is not None:
            image = transposed
        image.load()
    except Exception as exc:
        raise AppException("无法读取这张图片，请换一张 jpg、png 或 webp") from exc

    image = image.convert("RGBA")
    width, height = image.size
    if width < 1 or height < 1:
        raise AppException("图片尺寸无效")

    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    if image.size != (AVATAR_PX, AVATAR_PX):
        image = image.resize((AVATAR_PX, AVATAR_PX), Image.Resampling.LANCZOS)

    background = Image.new("RGB", (AVATAR_PX, AVATAR_PX), (255, 255, 255))
    background.paste(image, mask=image.getchannel("A"))
    buffer = io.BytesIO()
    background.save(buffer, format="JPEG", quality=85, optimize=True)
    return buffer.getvalue()


async def save_avatar_file(user_id: int, file: UploadFile) -> str:
    """把头像保存到项目内 uploads/avatars，每人只保留一份头像尺寸的图片。"""

    original_name = file.filename or "avatar"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise AppException("头像仅支持 jpg、png、webp、gif 图片")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE_BYTES:
        raise AppException("头像大小不能超过 2MB")
    if not content:
        raise AppException("上传的文件内容为空")

    avatar_bytes = render_avatar_bytes(content)

    target_dir = UPLOAD_ROOT / AVATAR_SUBDIR
    target_dir.mkdir(parents=True, exist_ok=True)
    for old in target_dir.glob(f"{user_id}.*"):
        if old.is_file():
            old.unlink()

    stored_name = f"{user_id}.jpg"
    (target_dir / stored_name).write_bytes(avatar_bytes)
    return f"/uploads/{AVATAR_SUBDIR}/{stored_name}?v={int(time.time())}"
